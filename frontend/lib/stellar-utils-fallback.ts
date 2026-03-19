// Fallback Stellar utilities for when SDK is not available
// This provides mock functionality for development/testing

export async function submitDonationTransactionFallback(
  senderPublicKey: string,
  receiverAddress: string,
  amount: string,
  taskId: string,
  signTransaction: (tx: string) => Promise<string>,
) {
  try {
    // Simulate transaction processing time
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Generate mock transaction hash
    const mockHash = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      success: true,
      hash: mockHash,
      ledger: Math.floor(Math.random() * 1000000),
    }
  } catch (error) {
    throw error
  }
}

export async function getAccountBalanceFallback(publicKey: string) {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Return mock balance
    return Math.random() * 1000
  } catch (error) {
    return 0
  }
}

export async function createStellarAccountFallback() {
  try {
    // Generate mock keypair
    const mockPublicKey = `G${Math.random().toString(36).substr(2, 55)}`
    const mockSecretKey = `S${Math.random().toString(36).substr(2, 55)}`

    return {
      publicKey: mockPublicKey,
      secretKey: mockSecretKey,
    }
  } catch (error) {
    throw error
  }
}
