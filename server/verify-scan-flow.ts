
import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function verifyScanFlow() {
  console.log('--- STARTING SCAN FLOW VERIFICATION ---');
  
  // 1. Find a test order or QR code
  const qr = await prisma.qRCode.findFirst();
  if (!qr) {
    console.log('No QR code found in DB. Please run seed first.');
    return;
  }
  
  console.log(`Found QR code: ${qr.shortCode} (Purpose: ${qr.purpose})`);
  
  // 2. Simulate a scan creation logic (similar to qr.controller.ts browserScan)
  const scanCountBefore = await prisma.qRScan.count({ where: { qrCodeId: qr.id } });
  console.log(`Scans before: ${scanCountBefore}`);
  
  const scan = await prisma.qRScan.create({
    data: {
      qrCodeId: qr.id,
      scanSource: 'BROWSER',
      scanNumber: scanCountBefore + 1,
      userAgent: 'Mozilla/5.0 (Pramanik-Verification-Robot)',
      deviceType: 'desktop',
      os: 'linux',
      browser: 'chrome',
      ipAddress: '8.8.8.8',
      ipCountry: 'US',
      resolvedLocation: 'Mountain View, CA, US',
      coordinateSource: 'ip',
      anchorReason: scanCountBefore === 0 ? 'first_scan' : null, // simulate anchoring trigger
    }
  });
  
  console.log(`Created scan event: id=${scan.id}, scanNumber=${scan.scanNumber}, anchorReason=${scan.anchorReason}`);
  
  // 3. Verify anchoring job eligibility
  const pending = await prisma.qRScan.findMany({
    where: {
      anchorReason: { not: null },
      anchoredOnChain: false,
    }
  });
  
  console.log(`Total scans pending anchor: ${pending.length}`);
  const isFound = pending.some(s => s.id === scan.id);
  
  if (scan.anchorReason && isFound) {
    console.log('SUCCESS: Scan is correctly queued for blockchain anchoring.');
  } else if (!scan.anchorReason) {
    console.log('SUCCESS: Scan recorded (no anchoring required for this milestone).');
  } else {
    console.log('FAILURE: Scan was not found in pending anchor queue.');
  }

  // Cleanup test scan
  await prisma.qRScan.delete({ where: { id: scan.id } });
  console.log('Test record cleaned up.');
  
  await prisma.$disconnect();
}

verifyScanFlow().catch(console.error);
