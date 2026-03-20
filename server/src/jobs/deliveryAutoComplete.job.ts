import { prisma } from '../lib/prisma.js';
import { EscrowService } from '../services/stellar/escrow.service.js';
import { notifySupplier } from '../services/whatsapp/whatsapp.service.js';
import logger from '../util/logger.js';

const escrowService = new EscrowService();

export async function processExpiredProofWindows() {
  const now = new Date();

  // Find delivered orders whose 72h window has expired with no dispute proof
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      proofDeadlineAt: { lte: now },
      buyerProofCid: null,          // no dispute proof uploaded
      autoCompletedAt: null,        // not already auto-completed
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          supplierId: true,
        },
      },
      buyer: { select: { id: true } },
    },
    take: 20, // process in batches
  });

  if (expiredOrders.length === 0) return;

  logger.info(`[DeliveryJob] Auto-completing ${expiredOrders.length} expired orders`);

  for (const order of expiredOrders) {
    try {
      // Release escrow on Stellar
      const escrowResult = await escrowService.releaseEscrow(
        order.escrowContractId || order.id
      );

      // Update order
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          autoCompletedAt: now,
          refundEligible: false,
          releaseTxId: (escrowResult as any)?.hash || null,
        },
      });

      // Update supplier totalSales
      await prisma.supplier.update({
        where: { id: order.product.supplierId },
        data: { totalSales: { increment: 1 } },
      });

      // Notify supplier via WhatsApp
      await notifySupplier(order.product.supplierId, 'PAYMENT_RELEASED', {
        amountUsdc: Number(order.priceUsdc).toFixed(4),
        orderId: order.id,
        productId: order.product.id,
        note: 'Auto-released after 72-hour proof window expired with no buyer dispute.',
      });

      // In-app notification for buyer
      await prisma.notification.create({
        data: {
          userId: order.buyer.id,
          type: 'PROOF_DEADLINE_PASSED',
          title: 'Proof window closed — order completed',
          body: `The 72-hour window to report issues with "${order.product.title}" has closed. Payment has been released to the supplier. No refund is possible.`,
          referenceId: order.id,
        },
      });

      logger.info(`[DeliveryJob] Auto-completed order ${order.id}`);
    } catch (err: any) {
      logger.warn(`[DeliveryJob] Failed to auto-complete order ${order.id}: ${err.message}`);
    }
  }
}

export async function sendProofWindowWarnings() {
  const now = new Date();
  const warningCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now

  const approachingOrders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      proofDeadlineAt: { gte: now, lte: warningCutoff },
      buyerProofCid: null,
      buyer: {
        notifications: {
          none: {
            type: 'REFUND_WINDOW_CLOSING',
            referenceId: { equals: undefined },
          },
        },
      },
    },
    include: {
      product: { select: { title: true } },
      buyer: { select: { id: true } },
    },
    take: 20,
  });

  for (const order of approachingOrders) {
    const hoursLeft = order.proofDeadlineAt
      ? Math.round((order.proofDeadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60))
      : 0;

    const alreadyWarned = await prisma.notification.findFirst({
      where: { userId: order.buyer.id, type: 'REFUND_WINDOW_CLOSING', referenceId: order.id },
    });
    if (alreadyWarned) continue;

    await prisma.notification.create({
      data: {
        userId: order.buyer.id,
        type: 'REFUND_WINDOW_CLOSING',
        title: `⚠️ ${hoursLeft}h left to report issues`,
        body: `You have ${hoursLeft} hours to upload proof if something is wrong with "${order.product.title}". After this window closes, no refund is possible.`,
        referenceId: order.id,
      },
    });
  }
}

export function startDeliveryAutoCompleteJob() {
  setInterval(processExpiredProofWindows, 15 * 60 * 1000); // every 15 min
  setInterval(sendProofWindowWarnings, 60 * 60 * 1000);    // every 1 hour
  logger.info('[DeliveryJob] Auto-complete job started');
}
