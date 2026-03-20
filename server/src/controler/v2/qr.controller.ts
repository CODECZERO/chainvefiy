import { Request, Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import QRCodeLib from 'qrcode';
import geoip from 'geoip-lite';
import { prisma } from '../../lib/prisma.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { cacheGet, cacheSet, buildCacheKey } from '../../lib/redis.js';
import { maskIp, countryCodeToName, inferScannerRole } from '../../util/qr.util.js';
import { server, STACK_ADMIN_SECRET } from '../../services/stellar/smartContract.handler.stellar.js';
import { Keypair, TransactionBuilder, Networks, Operation, Asset, Memo, BASE_FEE } from '@stellar/stellar-sdk';
import logger from '../../util/logger.js';
import type { MachineRequest } from '../../midelware/machine.midelware.js';
import { detectScanAnomalies } from '../../util/qrAnomaly.util.js';

// ─── Helper: resolve IP geolocation with Redis cache ────────────────────────
async function resolveGeo(ip: string) {
  const geoKey = `geo:${ip}`;
  let geo = await cacheGet<any>(geoKey);
  if (!geo) {
    const result = geoip.lookup(ip);
    geo = result
      ? { country: result.country, city: result.city, region: result.region,
          lat: result.ll[0], lng: result.ll[1], isp: '' }
      : { country: null, city: null, region: null, lat: null, lng: null, isp: '' };
    await cacheSet(geoKey, geo, 3600);
  }
  return geo;
}

// ─── Helper: reverse geocode coordinates ────────────────────────────────────
async function reverseGeocode(lat: number | null, lng: number | null, fallback: string | null): Promise<string | null> {
  if (!lat || !lng) return fallback;
  const coordKey = `revgeo:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  let cached = await cacheGet<string | null>(coordKey);
  if (cached !== null && cached !== undefined) return cached;
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'Pramanik-Marketplace/1.0' }, signal: AbortSignal.timeout(3000) }
    );
    const json = await resp.json();
    cached = json.display_name?.split(',').slice(0, 4).join(',').trim() || null;
  } catch { cached = null; }
  await cacheSet(coordKey, cached, 86400);
  return cached || fallback;
}

// ─── Helper: detect proxy from ISP ──────────────────────────────────────────
function detectProxy(isp: string): boolean {
  const keywords = ['vpn','proxy','tor','hosting','datacenter','digitalocean','linode','vultr','hetzner'];
  return keywords.some(kw => (isp || '').toLowerCase().includes(kw));
}

// ─── Helper: check if scan should be anchored ───────────────────────────────
function getAnchorReason(scanNumber: number, isCrossBorder: boolean, scannerRole: string | null, scanSource: string): string | null {
  if (scanSource === 'MACHINE') return 'machine_scan';
  if (scanNumber === 1) return 'first_scan';
  if (scanNumber % 5 === 0) return `milestone_${scanNumber}`;
  if (isCrossBorder) return 'cross_border';
  if (scannerRole === 'customs') return 'customs_scan';
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  1. generateQR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const generateQR = async (req: Request, res: Response) => {
  const { purpose, orderId, productId, supplierId, productGTIN } = req.body;

  if (!purpose) throw new ApiError(400, 'purpose is required');

  // 1. Generate shortCode: PRM-XXXX
  const shortCode = 'PRM-' + randomBytes(3).toString('hex').toUpperCase().slice(0, 4);

  // 2. Generate QR ID
  const qrCodeId = uuidv4();

  // 3. Sign JWT token (never expires, server-side only)
  const qrSecret = process.env.QR_SECRET || 'default-qr-secret-replace-this';
  const token = jwt.sign(
    { qrCodeId, orderId, productId, purpose, shortCode, nonce: uuidv4() },
    qrSecret,
    { algorithm: 'HS256' }
  );

  // 4. Build GS1 Digital Link URI
  const appUrl = process.env.APP_URL || 'https://pramanik.app';
  const gtin = productGTIN || '09506000000000';
  const serial = orderId ? orderId.replace(/-/g, '').slice(0, 20) : qrCodeId.replace(/-/g, '').slice(0, 20);
  const gs1DigitalLink = `${appUrl}/01/${gtin}/21/${serial}?qr=${shortCode}${orderId ? `&order=${orderId}` : ''}`;

  // 5. Compute expiry based on purpose
  let expiresAt: Date | null = null;
  if (purpose === 'ORDER_BUYER') {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  } else if (purpose === 'ORDER_SUPPLIER') {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  // PRODUCT_PROOF and DELIVERY_CERT never expire

  // 6. Generate QR PNG as base64 — uses GS1 URI
  const qrImageBase64 = await QRCodeLib.toDataURL(gs1DigitalLink, {
    errorCorrectionLevel: 'H',
    width: 512,
    margin: 2,
  });

  // 7. Anchor genesis on Stellar (fire-and-forget)
  let genesisAnchorTx: string | null = null;
  try {
    const sha256Buffer = createHash('sha256').update(token).digest();
    const adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);
    const account = await server.getAccount(adminKeypair.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({
        destination: adminKeypair.publicKey(),
        asset: Asset.native(),
        amount: '0.0000001',
      }))
      .addMemo(Memo.hash(sha256Buffer))
      .setTimeout(30)
      .build();

    tx.sign(adminKeypair);
    const result = await server.sendTransaction(tx);
    genesisAnchorTx = result.hash;
    logger.info(`[QR] Genesis anchor tx: ${result.hash}`);
  } catch (err: any) {
    logger.warn(`[QR] Genesis anchor failed (non-blocking): ${err.message}`);
  }

  // 8. Save QRCode to DB
  await prisma.qRCode.create({
    data: {
      id: qrCodeId,
      shortCode,
      token,
      purpose,
      orderId: orderId || null,
      productId: productId || null,
      supplierId: supplierId || null,
      genesisAnchorTx,
      productGTIN: gtin,
      serialNumber: serial,
      gs1DigitalLink,
      expiresAt,
    },
  });

  return res.status(201).json(
    new ApiResponse(201, {
      qrCodeId,
      shortCode,
      qrImageBase64,
      genesisAnchorTx,
      gs1DigitalLink,
      expiresAt,
    }, 'QR generated')
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  2. browserScan
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const browserScan = async (req: Request, res: Response) => {
  const body = req.body;
  const { shortCode } = body;

  if (!shortCode) throw new ApiError(400, 'shortCode is required');

  // 1. Find QR code + check expiry
  const qrCode = await prisma.qRCode.findUnique({ where: { shortCode } });
  if (!qrCode) throw new ApiError(404, 'QR code not found');
  if (qrCode.isExpired || (qrCode.expiresAt && new Date() > qrCode.expiresAt)) {
    if (!qrCode.isExpired) await prisma.qRCode.update({ where: { id: qrCode.id }, data: { isExpired: true } });
    throw new ApiError(410, 'This QR code has expired');
  }

  // 2. Resolve IP geolocation
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
  const geo = await resolveGeo(ip);

  // 3. Proxy detection
  const ipIsProxy = detectProxy(geo.isp);

  // 4. Resolve best coordinates (GPS > IP)
  const hasGps = body.locationPermission === 'granted' && body.gpsLat != null;
  const resolvedLat = hasGps ? body.gpsLat : geo.lat;
  const resolvedLng = hasGps ? body.gpsLng : geo.lng;
  const coordinateSource = hasGps ? 'gps' : (geo.lat ? 'ip' : 'none');

  // 5. Reverse geocode
  const fallbackLocation = geo.city ? `${geo.city}, ${geo.region}, ${geo.country}` : null;
  const resolvedLocation = await reverseGeocode(resolvedLat, resolvedLng, fallbackLocation);

  // 6. Compute scan number
  const scanNumber = (await prisma.qRScan.count({ where: { qrCodeId: qrCode.id } })) + 1;

  // 7. Infer scanner role
  const scannerRole = inferScannerRole(body.walletAddress, qrCode);

  // 8. Generate ephemeral scan token (5-min expiry, anti-replay)
  const qrSecret = process.env.QR_SECRET || 'default-qr-secret-replace-this';
  const scanTokenValue = jwt.sign(
    { shortCode, scanNumber, nonce: uuidv4() },
    qrSecret,
    { expiresIn: '5m' }
  );

  // 9. Create scan record
  const scan = await prisma.qRScan.create({
    data: {
      qrCodeId: qrCode.id,
      scanSource: 'BROWSER',
      scanNumber,
      clientTimestamp: body.clientTimestamp ? new Date(body.clientTimestamp) : null,
      userAgent: body.userAgent,
      deviceType: body.deviceType,
      os: body.os,
      browser: body.browser,
      screenResolution: body.screenResolution,
      language: body.language,
      timezone: body.timezone,
      connectionType: body.connectionType,
      referrer: body.referrer,
      isOnline: body.isOnline,
      gpsLat: body.gpsLat ?? null,
      gpsLng: body.gpsLng ?? null,
      gpsAccuracy: body.gpsAccuracy ?? null,
      gpsAltitude: body.gpsAltitude ?? null,
      locationPermission: body.locationPermission,
      ipAddress: maskIp(ip),
      ipCountry: geo.country,
      ipCountryName: countryCodeToName(geo.country),
      ipCity: geo.city,
      ipRegion: geo.region,
      ipIsp: geo.isp,
      ipIsProxy,
      ipLat: geo.lat,
      ipLng: geo.lng,
      resolvedLat,
      resolvedLng,
      resolvedLocation,
      coordinateSource,
      walletConnected: body.walletConnected ?? false,
      walletAddress: body.walletAddress ?? null,
      scannerRole,
      scanToken: scanTokenValue,
      viewType: body.viewType ?? 'default',
    },
  });

  // 10. Update QRCode summary
  const isNewCountry = geo.country && !qrCode.countriesReached.includes(geo.country);
  const isCrossBorder = !!(isNewCountry && qrCode.totalScans > 0);

  await prisma.qRCode.update({
    where: { id: qrCode.id },
    data: {
      totalScans: { increment: 1 },
      browserScans: { increment: 1 },
      lastScannedAt: new Date(),
      lastScannedCity: geo.city ?? undefined,
      lastScannedCountry: geo.country ?? undefined,
      firstScannedAt: qrCode.firstScannedAt ?? new Date(),
      countriesReached: isNewCountry ? { push: geo.country } : undefined,
    },
  });

  // 11. Determine if this scan should be anchored
  const anchorReason = getAnchorReason(scanNumber, isCrossBorder, scannerRole, 'BROWSER');
  if (anchorReason) {
    await prisma.qRScan.update({
      where: { id: scan.id },
      data: { anchorReason },
    });
  }

  // 12. Fire anomaly detection (fire-and-forget — do NOT await in request handler)
  detectScanAnomalies(qrCode.id, {
    ipAddress: maskIp(ip),
    resolvedLat,
    resolvedLng,
    serverTimestamp: new Date(),
    ipIsProxy,
    ipCountry: geo.country,
  }).then(async (anomaly) => {
    if (anomaly.score > 0) {
      await prisma.qRScan.update({
        where: { id: scan.id },
        data: { anomalyScore: anomaly.score, anomalyReasons: anomaly.reasons },
      });
    }
    if (anomaly.score >= 50) {
      await prisma.qRCode.update({
        where: { id: qrCode.id },
        data: { anomalyCount: { increment: 1 }, lastAnomalyAt: new Date() },
      });
      const adminId = process.env.PLATFORM_ADMIN_USER_ID;
      if (adminId) {
        await prisma.notification.create({
          data: {
            userId: adminId,
            type: 'DISPUTE_OPENED',
            title: `⚠️ Suspicious QR activity: ${qrCode.shortCode}`,
            body: `Anomaly score ${anomaly.score}. Reasons: ${anomaly.reasons.join(', ')}. Scan #${scanNumber}`,
            referenceId: qrCode.id,
          },
        });
      }
    }
  }).catch(err => logger.warn(`[QR] Anomaly detection failed (non-blocking): ${err.message}`));

  return res.status(201).json(
    new ApiResponse(201, {
      scanId: scan.id,
      scanNumber,
      scanToken: scanTokenValue,
      totalScans: qrCode.totalScans + 1,
      resolvedLocation,
      coordinateSource,
      isAnchoredOnChain: false,
      anchorPending: !!anchorReason,
    }, 'Scan recorded')
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  3. updateScanLocation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const updateScanLocation = async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const body = req.body;

  const scan = await prisma.qRScan.findUnique({ where: { id: scanId } });
  if (!scan || scan.scanSource !== 'BROWSER') throw new ApiError(404, 'Scan not found');

  // Only allow location update within 30 seconds of scan creation
  const ageSeconds = (Date.now() - scan.createdAt.getTime()) / 1000;
  if (ageSeconds > 30) throw new ApiError(409, 'Scan too old to update location');

  const resolvedLocation = await reverseGeocode(body.gpsLat, body.gpsLng, null);

  await prisma.qRScan.update({
    where: { id: scan.id },
    data: {
      gpsLat: body.gpsLat,
      gpsLng: body.gpsLng,
      gpsAccuracy: body.gpsAccuracy,
      gpsAltitude: body.gpsAltitude,
      locationPermission: 'granted',
      resolvedLat: body.gpsLat,
      resolvedLng: body.gpsLng,
      resolvedLocation,
      coordinateSource: 'gps',
    },
  });

  return res.status(200).json(
    new ApiResponse(200, { scanId, resolvedLocation }, 'Location updated')
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  4. machineScan
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const machineScan = async (req: MachineRequest, res: Response) => {
  const body = req.body;
  const machine = req.machineScanner!;

  // 1. Extract shortCode from rawScanData
  let shortCode: string | null = null;
  try {
    const url = new URL(body.rawScanData);
    shortCode = url.searchParams.get('qr');
  } catch {
    const match = (body.rawScanData || '').match(/PRM-[A-Z0-9]{4}/);
    shortCode = match ? match[0] : null;
  }
  if (!shortCode) throw new ApiError(400, 'Could not extract shortCode from scan data');

  // 2. Find QR code
  const qrCode = await prisma.qRCode.findUnique({ where: { shortCode } });
  if (!qrCode) throw new ApiError(404, 'QR code not found');

  // 3. Resolve IP geolocation
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
  const geo = await resolveGeo(ip);

  // 4. Set coordinates from machine's fixed location
  const resolvedLat = machine.fixedLat;
  const resolvedLng = machine.fixedLng;
  const resolvedLocation = machine.fixedLocation;
  const coordinateSource = machine.fixedLat ? 'machine_fixed' : (geo.lat ? 'ip' : 'none');

  // 5. Compute scan number
  const scanNumber = (await prisma.qRScan.count({ where: { qrCodeId: qrCode.id } })) + 1;

  // 6. Create scan record
  const scan = await prisma.qRScan.create({
    data: {
      qrCodeId: qrCode.id,
      scanSource: 'MACHINE',
      machineScannerIdRef: machine.id,
      scanNumber,
      clientTimestamp: body.clientTimestamp ? new Date(body.clientTimestamp) : null,
      machineDeviceId: machine.id,
      machineModel: machine.deviceModel,
      machineFirmware: body.firmwareVersion ?? null,
      rawScanData: body.rawScanData,
      machineEventType: body.eventType ?? 'scan',
      ipAddress: maskIp(ip),
      ipCountry: geo.country,
      ipCountryName: countryCodeToName(geo.country),
      ipCity: geo.city,
      ipRegion: geo.region,
      ipIsProxy: false,
      resolvedLat,
      resolvedLng,
      resolvedLocation,
      coordinateSource,
      scannerRole: 'warehouse',
      anchorReason: 'machine_scan', // always anchor machine scans
    },
  });

  // 7. Update QRCode summary
  const isNewCountry = (machine.fixedCountry || geo.country) &&
    !qrCode.countriesReached.includes(machine.fixedCountry || geo.country || '');

  await prisma.qRCode.update({
    where: { id: qrCode.id },
    data: {
      totalScans: { increment: 1 },
      machineScans: { increment: 1 },
      lastScannedAt: new Date(),
      lastScannedCity: geo.city ?? undefined,
      lastScannedCountry: machine.fixedCountry || geo.country || undefined,
      firstScannedAt: qrCode.firstScannedAt ?? new Date(),
      countriesReached: isNewCountry ? { push: machine.fixedCountry || geo.country! } : undefined,
    },
  });

  // 8. Update machine scanner stats
  await prisma.machineScanner.update({
    where: { id: machine.id },
    data: { totalScans: { increment: 1 }, lastSeenAt: new Date() },
  });

  return res.status(201).json(
    new ApiResponse(201, {
      scanId: scan.id,
      scanNumber,
      shortCode,
      resolvedLocation,
      anchorQueued: true,
    }, 'Machine scan recorded')
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  5. getJourney
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getJourney = async (req: Request, res: Response) => {
  const { shortCode } = req.params;

  // Cache full journey response for 30 seconds
  const cacheKey = buildCacheKey('journey', { shortCode });
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached, 'Journey fetched (cached)'));

  const qrCode = await prisma.qRCode.findUnique({
    where: { shortCode },
    include: {
      order: {
        select: {
          status: true, priceUsdc: true,
          product: {
            select: {
              title: true, proofMediaUrls: true,
              supplier: { select: { name: true, location: true, trustScore: true } }
            }
          }
        }
      },
      product: {
        select: { title: true, supplier: { select: { name: true, location: true } } }
      },
      scans: {
        orderBy: { scanNumber: 'asc' },
        select: {
          scanNumber: true,
          serverTimestamp: true,
          scanSource: true,
          resolvedLocation: true,
          resolvedLat: true,
          resolvedLng: true,
          coordinateSource: true,
          deviceType: true,
          os: true,
          browser: true,
          ipCountry: true,
          ipCountryName: true,
          timezone: true,
          scannerRole: true,
          walletConnected: true,
          anchoredOnChain: true,
          anchorTxId: true,
          anchorReason: true,
          machineModel: true,
          machineEventType: true,
          ipIsProxy: true,
          // NEVER: ipAddress, walletAddress, userAgent
        }
      }
    }
  });

  if (!qrCode) throw new ApiError(404, 'QR code not found');

  const data = {
    qrCode: {
      shortCode: qrCode.shortCode,
      purpose: qrCode.purpose,
      totalScans: qrCode.totalScans,
      browserScans: qrCode.browserScans,
      machineScans: qrCode.machineScans,
      uniqueDevices: qrCode.uniqueDevices,
      countriesReached: qrCode.countriesReached,
      firstScannedAt: qrCode.firstScannedAt,
      lastScannedAt: qrCode.lastScannedAt,
      totalAnchors: qrCode.totalAnchors,
      genesisAnchorTx: qrCode.genesisAnchorTx,
      latestAnchorTx: qrCode.latestAnchorTx,
      anomalyCount: qrCode.anomalyCount,
      isExpired: qrCode.isExpired,
      gs1DigitalLink: qrCode.gs1DigitalLink,
    },
    order: qrCode.order,
    product: qrCode.product,
    scans: qrCode.scans,
  };

  await cacheSet(cacheKey, data, 30);

  return res.json(new ApiResponse(200, data, 'Journey fetched'));
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  6. getMapData
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getMapData = async (req: Request, res: Response) => {
  const { shortCode } = req.params;

  const cacheKey = buildCacheKey('mapdata', { shortCode });
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached, 'Map data (cached)'));

  const scans = await prisma.qRScan.findMany({
    where: { qrCode: { shortCode }, resolvedLat: { not: null } },
    orderBy: { scanNumber: 'asc' },
    select: {
      scanNumber: true,
      serverTimestamp: true,
      resolvedLat: true,
      resolvedLng: true,
      ipCountry: true,
      ipCountryName: true,
      deviceType: true,
      scanSource: true,
      scannerRole: true,
      anchoredOnChain: true,
      ipIsProxy: true,
      machineModel: true,
    }
  });

  await cacheSet(cacheKey, scans, 30);

  return res.json(new ApiResponse(200, scans, 'Map data fetched'));
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  7. getCertificate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getCertificate = async (req: Request, res: Response) => {
  const { shortCode } = req.params;

  const qrCode = await prisma.qRCode.findUnique({
    where: { shortCode },
    include: {
      order: {
        select: {
          id: true, status: true, priceUsdc: true,
          deliveryCertCid: true, deliveryCertTxId: true, deliveredAt: true,
          product: { select: { title: true, category: true } },
          buyer: { select: { stellarWallet: true } },
        }
      }
    }
  });

  if (!qrCode) throw new ApiError(404, 'QR code not found');
  if (!qrCode.order?.deliveryCertCid) throw new ApiError(404, 'No delivery certificate yet');

  return res.json(new ApiResponse(200, {
    shortCode: qrCode.shortCode,
    orderId: qrCode.order.id,
    status: qrCode.order.status,
    product: qrCode.order.product?.title,
    category: qrCode.order.product?.category,
    deliveryCertCid: qrCode.order.deliveryCertCid,
    deliveryCertTxId: qrCode.order.deliveryCertTxId,
    deliveredAt: qrCode.order.deliveredAt,
    ipfsUrl: `https://gateway.pinata.cloud/ipfs/${qrCode.order.deliveryCertCid}`,
    stellarExplorerUrl: qrCode.order.deliveryCertTxId
      ? `https://stellar.expert/explorer/testnet/tx/${qrCode.order.deliveryCertTxId}`
      : null,
    totalScans: qrCode.totalScans,
    countriesReached: qrCode.countriesReached,
    totalAnchors: qrCode.totalAnchors,
  }, 'Certificate fetched'));
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  8. registerMachine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const registerMachine = async (req: Request, res: Response) => {
  const body = req.body;

  if (!body.name) throw new ApiError(400, 'Machine name is required');

  // Generate secure API key
  const rawKey = randomBytes(32).toString('hex');
  const hashedKey = createHash('sha256').update(rawKey).digest('hex');
  const hint = rawKey.slice(-4).toUpperCase();

  const machine = await prisma.machineScanner.create({
    data: {
      apiKey: hashedKey,
      apiKeyHint: hint,
      name: body.name,
      deviceModel: body.deviceModel ?? null,
      firmwareVersion: body.firmwareVersion ?? null,
      supplierId: body.supplierId ?? null,
      fixedLat: body.fixedLat ?? null,
      fixedLng: body.fixedLng ?? null,
      fixedLocation: body.fixedLocation ?? null,
      fixedCountry: body.fixedCountry ?? null,
    }
  });

  const appUrl = process.env.APP_URL || 'http://localhost:8000';

  return res.status(201).json(
    new ApiResponse(201, {
      machineId: machine.id,
      apiKey: rawKey,
      apiKeyHint: hint,
      warning: 'Store this API key securely. It will not be shown again.',
      webhookUrl: `${appUrl}/api/qr/machine-scan`,
      instructions: {
        header: 'X-Machine-API-Key',
        method: 'POST',
        contentType: 'application/json',
        exampleBody: {
          rawScanData: `https://pramanik.app/proof/ORDER_ID?qr=PRM-4X9K`,
          clientTimestamp: new Date().toISOString(),
          eventType: 'scan',
        }
      }
    }, 'Machine registered')
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  9. resolveQR — Smart routing by scan context (<100ms target)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const resolveQR = async (req: Request, res: Response) => {
  const { shortCode } = req.params;
  const appUrl = process.env.APP_URL || 'https://pramanik.app';

  // Cache QR record for 60s to keep resolution <100ms
  const cacheKey = `qr:resolve:${shortCode}`;
  let qrCode = await cacheGet<any>(cacheKey);
  if (!qrCode) {
    qrCode = await prisma.qRCode.findUnique({
      where: { shortCode },
      include: {
        order: {
          select: {
            id: true, status: true,
            product: {
              select: {
                supplier: { select: { location: true } }
              }
            }
          }
        }
      }
    });
    if (qrCode) await cacheSet(cacheKey, qrCode, 60);
  }

  if (!qrCode) return res.redirect(`${appUrl}/404`);

  // Check expiry
  if (qrCode.isExpired || (qrCode.expiresAt && new Date() > qrCode.expiresAt)) {
    if (!qrCode.isExpired) {
      await prisma.qRCode.update({ where: { id: qrCode.id }, data: { isExpired: true } });
    }
    return res.redirect(`${appUrl}/qr-expired?code=${shortCode}&purpose=${qrCode.purpose}`);
  }

  const userAgent = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';

  // Rule 1: Machine/API scanner → JSON endpoint
  const isMachine =
    req.headers['x-machine-api-key'] ||
    /zebra|honeywell|datalogic|cognex|scanner/i.test(userAgent) ||
    (!accept.includes('text/html') && accept.includes('application/json'));

  if (isMachine) {
    return res.redirect(307, `/api/qr/${shortCode}/machine-data`);
  }

  const orderId = qrCode.orderId || qrCode.id;

  // Rule 2: Route by country — international scan = logistics view
  const geo = await resolveGeo(ip);
  const originCountry = qrCode.order?.product?.supplier?.location
    ?.split(',').pop()?.trim().toLowerCase();
  const scanCountry = geo.country?.toLowerCase();

  if (scanCountry && originCountry && scanCountry !== originCountry) {
    return res.redirect(`${appUrl}/proof/${orderId}?qr=${shortCode}&view=logistics`);
  }

  // Rule 3: First scan ever → origin confirmation
  if (qrCode.totalScans === 0) {
    return res.redirect(`${appUrl}/proof/${orderId}?qr=${shortCode}&view=origin`);
  }

  // Rule 4: Outside business hours (UTC 22-06) → simplified view
  const hour = new Date().getUTCHours();
  if (hour < 6 || hour > 22) {
    return res.redirect(`${appUrl}/proof/${orderId}?qr=${shortCode}&view=minimal`);
  }

  // Default: full proof page
  return res.redirect(`${appUrl}/proof/${orderId}?qr=${shortCode}`);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. getMachineData — Lightweight JSON for handheld displays (<200ms)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getMachineData = async (req: Request, res: Response) => {
  const { shortCode } = req.params;

  // Cache for 30s — handheld scanners have 2-3s timeout windows
  const cacheKey = buildCacheKey('machine-data', { shortCode });
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const qrCode = await prisma.qRCode.findUnique({
    where: { shortCode },
    include: {
      order: {
        select: {
          status: true,
          product: {
            select: {
              title: true, category: true,
              supplier: { select: { name: true, location: true, trustScore: true, isVerified: true } }
            }
          }
        }
      },
      scans: {
        orderBy: { scanNumber: 'desc' },
        take: 1,
        select: { resolvedLocation: true, serverTimestamp: true }
      }
    }
  });

  if (!qrCode) return res.status(404).json({ error: 'QR code not found' });

  const lastScan = qrCode.scans[0];
  const data = {
    shortCode: qrCode.shortCode,
    status: qrCode.order?.status || 'UNKNOWN',
    product: {
      title: qrCode.order?.product?.title || 'Unknown',
      gtin: qrCode.productGTIN,
      serial: qrCode.serialNumber,
      origin: qrCode.order?.product?.supplier?.location || 'Unknown',
    },
    supplier: {
      name: qrCode.order?.product?.supplier?.name || 'Unknown',
      trustScore: qrCode.order?.product?.supplier?.trustScore || 0,
      verified: qrCode.order?.product?.supplier?.isVerified || false,
    },
    journey: {
      totalCheckpoints: qrCode.totalScans,
      lastCheckpoint: lastScan?.resolvedLocation || 'None',
      lastCheckpointAt: lastScan?.serverTimestamp || null,
      latestAnchorTx: qrCode.latestAnchorTx,
      stellarExplorer: qrCode.latestAnchorTx
        ? `https://stellar.expert/explorer/testnet/tx/${qrCode.latestAnchorTx}`
        : null,
    },
    alert: qrCode.anomalyCount > 0
      ? `SUSPICIOUS_ACTIVITY — ${qrCode.anomalyCount} anomalous scan(s) detected. Verify product authenticity before processing.`
      : null,
  };

  await cacheSet(cacheKey, data, 30);

  return res.json(data);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. verifyScanToken — One-time token verification (anti-replay)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const verifyScanToken = async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const { scanToken } = req.body;

  if (!scanToken) throw new ApiError(400, 'scanToken is required');

  // 1. Find the scan
  const scan = await prisma.qRScan.findUnique({ where: { id: scanId } });
  if (!scan) throw new ApiError(404, 'Scan not found');

  // 2. Check if already used
  if (scan.scanTokenUsed) throw new ApiError(409, 'Scan token already used');

  // 3. Verify JWT
  const qrSecret = process.env.QR_SECRET || 'default-qr-secret-replace-this';
  try {
    jwt.verify(scanToken, qrSecret);
  } catch {
    throw new ApiError(401, 'Scan token expired or invalid');
  }

  // 4. Compare with stored token
  if (scan.scanToken !== scanToken) throw new ApiError(401, 'Scan token mismatch');

  // 5. Mark as used
  await prisma.qRScan.update({
    where: { id: scanId },
    data: { scanTokenUsed: true },
  });

  return res.json(new ApiResponse(200, { scanId, verified: true }, 'Scan token verified'));
};
