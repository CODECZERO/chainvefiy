export function getIPFSUrl(src: string | null | undefined): string {
  if (!src) return ""
  
  // If it's already a full URL, return it
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src
  }
  
  // Strip ipfs:// prefix if present
  let cleanSrc = src;
  if (src.startsWith("ipfs://")) {
    cleanSrc = src.replace("ipfs://", "");
  }

  // If it's a CID (starts with Qm or ba), prefix with Pinata gateway and add token
  if (cleanSrc.length >= 46) {
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "azure-official-egret-883.mypinata.cloud"
    const token = process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN
    const baseUrl = `https://${gateway}/ipfs/${cleanSrc}`
    return token ? `${baseUrl}?pinataGatewayToken=${token}` : baseUrl
  }
  
  return cleanSrc
}
