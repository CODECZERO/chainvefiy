import { createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';
import logger from '../util/logger.js';
import { Keypair, TransactionBuilder, Networks, Operation, Asset, Memo, BASE_FEE } from '@stellar/stellar-sdk';
import { horizonServer, STACK_ADMIN_SECRET, adminSequenceManager } from '../services/stellar/smartContract.handler.stellar.js';
import { Account } from '@stellar/stellar-sdk';

const ANCHOR_INTERVAL_MS = 60_000; // Run every 60 seconds
const BATCH_SIZE = 10; // Anchor up to 10 scans per cycle

async function anchorPendingScans() {
  try {
    // 1. Fetch pending scans with valid qrCodeId to avoid IN(NULL)
    const pending = (await prisma.qRScan.findMany({
      where: {
        anchorReason: { not: null },
        anchoredOnChain: false,
        qrCodeId: { not: "" }, // This is usually enough for indexed fields, but let's be extra safe
      },
      include: {
        qrCode: { select: { id: true, shortCode: true, orderId: true } },
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    })) as any[];

    // Extra safety filter to ensure no null qrCodes get through to the Batch/IN query
    const validPending = pending.filter(p => p.qrCodeId && p.qrCode && p.qrCode.id);

    if (validPending.length === 0) return;

    logger.info(`[Anchor] Processing ${validPending.length} valid pending scan anchors`);

    const adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);
    
    for (const scan of validPending) {
      try {
        const scanPayload = JSON.stringify({
          scanId: scan.id,
          qrShortCode: scan.qrCode.shortCode,
          orderId: scan.qrCode.orderId,
          scanNumber: scan.scanNumber,
          scanSource: scan.scanSource,
          resolvedLat: scan.resolvedLat,
          resolvedLng: scan.resolvedLng,
          resolvedLocation: scan.resolvedLocation,
          timestamp: scan.serverTimestamp.toISOString(),
          anchorReason: scan.anchorReason,
        });

        const sha256 = createHash('sha256').update(scanPayload).digest();

        // 3. Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction(
          [
            Operation.payment({
              destination: adminKeypair.publicKey(),
              asset: Asset.native(),
              amount: '0.0000001',
            })
          ],
          Memo.hash(sha256)
        );

        const result = await horizonServer.submitTransaction(tx);
        const txHash = result.hash;

        // 4. Update scan and QR code using batch-friendly logic (individual but fast)
        await prisma.$transaction([
          prisma.qRScan.update({
            where: { id: scan.id },
            data: { anchoredOnChain: true, anchorTxId: txHash },
          }),
          prisma.qRCode.update({
            where: { id: scan.qrCode.id },
            data: {
              totalAnchors: { increment: 1 },
              latestAnchorTx: txHash,
            },
          })
        ]);

        logger.info(`[Anchor] Scan #${scan.scanNumber} anchored: tx=${txHash}`);
      } catch (err: any) {
        logger.warn(`[Anchor] Failed to anchor scan ${scan.id}: ${err.message}`);
      }

      await new Promise((r) => setTimeout(r, 1000)); // Slightly reduced delay
    }
  } catch (err: any) {
    logger.error(`[Anchor] Job cycle error: ${err.message}`);
  }
}

export const startAnchorJob = () => {
  logger.info(`[Anchor] Starting blockchain anchor job (interval: ${ANCHOR_INTERVAL_MS / 1000}s)`);
  // Run once on startup after a short delay
  setTimeout(anchorPendingScans, 5000);
  // Then run on interval
  setInterval(anchorPendingScans, ANCHOR_INTERVAL_MS);
};
