export function getIPFSUrl(src: string | null | undefined): string {
  if (!src) return ""
  
  // If it's already a full URL, return it
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src
  }
  
  // If it's a CID (starts with Qm or ba), prefix with Pinata gateway
  // Pinata CIDs often start with baf... (V1) or Qm... (V0)
  if (src.length >= 46) {
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "azure-official-egret-883.mypinata.cloud"
    return `https://${gateway}/ipfs/${src}`
  }
  
  return src
}
