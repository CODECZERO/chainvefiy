import { createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';
import logger from '../util/logger.js';
import { Keypair, TransactionBuilder, Networks, Operation, Asset, Memo, BASE_FEE } from '@stellar/stellar-sdk';
import { horizonServer, STACK_ADMIN_SECRET } from '../services/stellar/smartContract.handler.stellar.js';

const ANCHOR_INTERVAL_MS = 60_000; // Run every 60 seconds
const BATCH_SIZE = 10; // Anchor up to 10 scans per cycle

async function anchorPendingScans() {
  try {
    // Find scans that have an anchorReason but haven't been anchored yet
    const pending = await prisma.qRScan.findMany({
      where: {
        anchorReason: { not: null },
        anchoredOnChain: false,
      },
      include: {
        qrCode: { select: { id: true, shortCode: true, orderId: true } },
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    });

    if (pending.length === 0) return;

    logger.info(`[Anchor] Processing ${pending.length} pending scan anchors`);

    const adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);

    for (const scan of pending) {
      try {
        // Create a deterministic hash of the scan data
        const scanPayload = JSON.stringify({
          scanId: scan.id,
          qrShortCode: scan.qrCode?.shortCode,
          orderId: scan.qrCode?.orderId,
          scanNumber: scan.scanNumber,
          scanSource: scan.scanSource,
          resolvedLat: scan.resolvedLat,
          resolvedLng: scan.resolvedLng,
          resolvedLocation: scan.resolvedLocation,
          timestamp: scan.serverTimestamp.toISOString(),
          anchorReason: scan.anchorReason,
        });

        const sha256 = createHash('sha256').update(scanPayload).digest();

        // Build a Stellar Horizon transaction with the hash as memo
        const account = await horizonServer.loadAccount(adminKeypair.publicKey());
        const tx = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(
            Operation.payment({
              destination: adminKeypair.publicKey(),
              asset: Asset.native(),
              amount: '0.0000001',
            })
          )
          .addMemo(Memo.hash(sha256))
          .setTimeout(30)
          .build();

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);
        const txHash = result.hash;

        // Mark the scan as anchored (only fields that exist in schema)
        await prisma.qRScan.update({
          where: { id: scan.id },
          data: {
            anchoredOnChain: true,
            anchorTxId: txHash,
          },
        });

        // Update QR code anchor count using the id field
        if (scan.qrCode?.id) {
          await prisma.qRCode.update({
            where: { id: scan.qrCode.id },
            data: {
              totalAnchors: { increment: 1 },
              latestAnchorTx: txHash,
            },
          });
        }

        logger.info(`[Anchor] Scan #${scan.scanNumber} anchored on Stellar: tx=${txHash}`);
      } catch (err: any) {
        logger.warn(`[Anchor] Failed to anchor scan ${scan.id}: ${err.message}`);
        // Don't crash the loop — continue with next scan
      }

      // Small delay between transactions to avoid rate limits
      await new Promise((r) => setTimeout(r, 1500));
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
