export type WalletType = "freighter" | "lobstr" | "albedo" | "stellar-expert" | "ledger"

export interface WalletInfo {
  id: WalletType
  name: string
  icon: string
  description: string
  installed: boolean
}

export interface WalletConnectResponse {
  publicKey: string
  error?: string
}
