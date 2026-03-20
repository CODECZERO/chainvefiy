// ─── QR Helper Utilities ─────────────────────────────────────────────────────

/**
 * Mask last IP octet for privacy.
 */
export function maskIp(ip: string): string {
  if (!ip) return 'unknown';
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)\d{1,3}$/);
  if (v4) return v4[1] + 'X';
  const v6parts = ip.split(':');
  if (v6parts.length > 2) return v6parts.slice(0, -1).join(':') + ':X';
  return ip;
}

/**
 * Map ISO-3166-1 alpha-2 to country name (top 30 trade countries).
 */
export function countryCodeToName(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    IN: 'India', US: 'United States', DE: 'Germany', CN: 'China',
    GB: 'United Kingdom', AE: 'UAE', SG: 'Singapore', JP: 'Japan',
    AU: 'Australia', CA: 'Canada', FR: 'France', NL: 'Netherlands',
    BR: 'Brazil', MX: 'Mexico', IT: 'Italy', KR: 'South Korea',
    SA: 'Saudi Arabia', ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya',
    RU: 'Russia', TR: 'Turkey', TH: 'Thailand', MY: 'Malaysia',
    ID: 'Indonesia', PH: 'Philippines', VN: 'Vietnam', PK: 'Pakistan',
    BD: 'Bangladesh', EG: 'Egypt',
  };
  return map[code] || code;
}

/**
 * Infer scanner role from wallet address and QR context.
 */
export function inferScannerRole(walletAddress: string | null, qrCode: any): string {
  if (!walletAddress) return 'public';
  if (qrCode.order?.product?.supplier?.stellarWallet === walletAddress) return 'supplier';
  if (qrCode.order?.buyer?.stellarWallet === walletAddress) return 'buyer';
  return 'unknown';
}
