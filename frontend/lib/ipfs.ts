const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";

/**
 * Returns a full IPFS image URL for display.
 * If cid is already a full URL, returns as-is. Otherwise prefixes with Pinata gateway.
 */
export function ipfsImageUrl(cid: string | undefined | null): string {
  if (!cid || typeof cid !== "string") return "https://placehold.co/600x400/000000/FFFFFF/png?text=No+Image";
  const trimmed = cid.trim();
  if (!trimmed || trimmed === "/placeholder.jpg" || trimmed === "placeholder.jpg")
    return "https://placehold.co/600x400/000000/FFFFFF/png?text=AidBridge";

  // If it's already a full URL or a local absolute path
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) return trimmed;

  // Format gateway URL - ensure it has a protocol
  let gateway = String(PINATA_GATEWAY || "https://gateway.pinata.cloud");
  if (gateway && !gateway.startsWith('http')) {
    gateway = `https://${gateway}`;
  }

  // Support for restricted gateways via token
  const token = process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN;
  const tokenQuery = (token && typeof token === "string") ? `?pinataGatewayToken=${token}` : "";

  // Clean the CID and construct URL
  const cleanCid = String(trimmed).replace("ipfs://", "").replace(/^\/ipfs\//, "");
  
  // Try dedicated gateway first, but allow easy fallback or use public if needed
  if (!gateway || gateway.includes("gateway.pinata.cloud")) {
    return `https://gateway.pinata.cloud/ipfs/${cleanCid}${tokenQuery}`;
  }

  return `${gateway}/ipfs/${cleanCid}${tokenQuery}`;
}
