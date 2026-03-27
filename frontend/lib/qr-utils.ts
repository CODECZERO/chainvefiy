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
