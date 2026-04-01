import { createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';
import logger from '../util/logger.js';
import { Keypair, Operation, Asset, Memo } from '@stellar/stellar-sdk';
import { horizonServer, STACK_ADMIN_SECRET, adminSequenceManager } from '../services/stellar/smartContract.handler.stellar.js';

const ANCHOR_INTERVAL_MS = 60_000; // Run every 60 seconds
const BATCH_SIZE = 10; // Anchor up to 10 scans per cycle

async function anchorPendingScans() {
  try {
    // 1. Fetch pending scans with valid qrCode connections
    // cast to any to bypass strict Prisma type mismatch on 'isNot: null' in some environments
    const pendingScans = await (prisma.qRScan.findMany({
      where: {
        anchoredOnChain: false,
        qrCode: { isNot: (undefined as any) }
      },
      include: {
        qrCode: true,
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    }) as Promise<any[]>);

    // Final safety filter before processing batch
    const validPending = pendingScans.filter((p: any) => p.qrCode && p.qrCode.id);

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

        // 3. Build and sign transaction with globally synchronized helper (prevents txBadSeq)
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

        // 4. Update scan and QR code
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

        logger.info(`[Anchor] Scan #${scan.scanNumber} anchored: tx=${txHash.slice(0, 8)}... location=${scan.resolvedLocation || 'Unknown'}`);
      } catch (err: any) {
        logger.warn(`[Anchor] Failed to anchor scan ${scan.id}: ${err.message}`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (err: any) {
    logger.error(`[Anchor] Job cycle error: ${err.message}`);
  }
}

export const startAnchorJob = () => {
  logger.info(`[Anchor] Starting blockchain anchor job (interval: ${ANCHOR_INTERVAL_MS / 1000}s)`);
  setTimeout(anchorPendingScans, 5000);
  setInterval(anchorPendingScans, ANCHOR_INTERVAL_MS);
};
