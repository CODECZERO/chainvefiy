export function countryToFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return "🌐";
  }
}

export function truncateWallet(address: string | null | undefined): string {
  if (!address) return "";
  if (typeof address !== "string") return "";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function detectDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return "Mobile";
  if (/tablet|ipad/i.test(userAgent)) return "Tablet";
  return "Desktop";
}

export function detectOS(userAgent: string): string {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/mac/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  return "Unknown";
}

export function detectBrowser(userAgent: string): string {
  if (/chrome|chromium|crios/i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent)) return "Safari";
  if (/opr\//i.test(userAgent)) return "Opera";
  if (/edg/i.test(userAgent)) return "Edge";
  return "Unknown";
}
