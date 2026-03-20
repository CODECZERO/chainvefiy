import { prisma } from '../lib/prisma.js';

interface AnomalyResult {
  score: number;
  reasons: string[];
}

/**
 * Detect anomalies in QR scan patterns.
 * Returns a score (0=clean, 1-49=suspicious, 50+=flagged) and reasons.
 * Called fire-and-forget after each scan — never blocks request handler.
 */
export async function detectScanAnomalies(
  qrCodeId: string,
  currentScan: {
    ipAddress: string;
    resolvedLat: number | null;
    resolvedLng: number | null;
    serverTimestamp: Date;
    ipIsProxy: boolean;
    ipCountry: string | null;
  }
): Promise<AnomalyResult> {
  const reasons: string[] = [];
  let score = 0;

  // Fetch last 10 scans for comparison
  const recentScans = await prisma.qRScan.findMany({
    where: { qrCodeId },
    orderBy: { serverTimestamp: 'desc' },
    take: 10,
    select: {
      ipAddress: true,
      resolvedLat: true,
      resolvedLng: true,
      serverTimestamp: true,
      ipCountry: true,
    },
  });

  // Rule 1 — Velocity burst: 5+ scans from same IP in 60 seconds
  const sameIpRecent = recentScans.filter(
    (s: { ipAddress: string | null; serverTimestamp: Date }) =>
      s.ipAddress === currentScan.ipAddress &&
      currentScan.serverTimestamp.getTime() - s.serverTimestamp.getTime() < 60_000
  );
  if (sameIpRecent.length >= 5) {
    score += 40;
    reasons.push('velocity_burst');
  }

  // Rule 2 — Impossible travel: >5000km in less time than possible at 1100km/h
  if (recentScans[0]?.resolvedLat && currentScan.resolvedLat) {
    const timeDiffHours =
      (currentScan.serverTimestamp.getTime() - recentScans[0].serverTimestamp.getTime())
      / (1000 * 60 * 60);
    if (timeDiffHours > 0) {
      const distanceKm = haversineKm(
        recentScans[0].resolvedLat, recentScans[0].resolvedLng!,
        currentScan.resolvedLat, currentScan.resolvedLng!
      );
      const maxPossibleKm = timeDiffHours * 1100;
      if (distanceKm > maxPossibleKm && distanceKm > 500) {
        score += 35;
        reasons.push('impossible_travel');
      }
    }
  }

  // Rule 3 — Proxy/VPN cluster: 3+ proxy scans on this QR
  const proxyScans = await prisma.qRScan.count({
    where: { qrCodeId, ipIsProxy: true },
  });
  if (proxyScans >= 3) {
    score += 25;
    reasons.push('proxy_cluster');
  }

  // Rule 4 — Country hopping: scans from 4+ countries in 1 hour
  const recentCountries = new Set(
    recentScans
      .filter((s: { serverTimestamp: Date }) =>
        currentScan.serverTimestamp.getTime() - s.serverTimestamp.getTime() < 3_600_000
      )
      .map((s: { ipCountry: string | null }) => s.ipCountry)
      .filter(Boolean)
  );
  if (currentScan.ipCountry) recentCountries.add(currentScan.ipCountry);
  if (recentCountries.size >= 4) {
    score += 20;
    reasons.push('country_hopping');
  }

  return { score, reasons };
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
