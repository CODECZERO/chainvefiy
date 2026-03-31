// Stellar Utils with Real API Integration
import { getWalletBalance, verifyBountyPayment, createStellarAccount as apiCreateStellarAccount, walletPay, sendPayment, getEscrowXdr, getVoteXdr, getSubmitProofXdr, submitEscrowTx } from './api-service';
import { kit } from './stellar-kit';

// Stellar SDK constants
export const NETWORKS = {
  TESTNET: "Test SDF Network ; September 2015",
}

/**
 * Submit a bounty payment on Stellar.
 */
export async function submitBountyTransaction(
  publicKey: string,
  receiverPublicKey: string,
  amount: string,
  bountyId: string,
  signTransaction: (tx: string) => Promise<string>,
) {
  try {
    const amountNumber = parseFloat(amount)
    if (isNaN(amountNumber) || amountNumber <= 0) {
      throw new Error("Invalid amount. Please enter a positive number.")
    }

    const formattedAmount = amountNumber.toFixed(7)
    if (!receiverPublicKey || receiverPublicKey.length !== 56 || !receiverPublicKey.startsWith('G')) {
      throw new Error("Invalid receiver wallet address")
    }

    const StellarSdk = await import('@stellar/stellar-sdk')
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org')
    const account = await server.loadAccount(publicKey)

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: receiverPublicKey,
          asset: StellarSdk.Asset.native(),
          amount: formattedAmount,
        })
      )
      .addMemo(StellarSdk.Memo.text(`Bounty`))
      .setTimeout(180)
      .build()

    const transactionXDR = transaction.toXDR()
    const signResult = await signTransaction(transactionXDR)
    const signedXDR = typeof signResult === 'string' ? signResult : (signResult as any)?.signedTxXdr ?? (signResult as any)?.signedTransaction ?? ''

    if (!signedXDR) {
      throw new Error('No signed transaction returned from wallet')
    }

    const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      StellarSdk.Networks.TESTNET
    )
    const transactionHash = signedTransaction.hash().toString('hex')
    const result = await server.submitTransaction(signedTransaction)

    const response = await verifyBountyPayment({
      bountyId: bountyId,
      transactionHash: transactionHash,
    })

    if (response.success) {
      return {
        success: true,
        hash: transactionHash,
        ledger: result.ledger,
        stellarResult: result,
        data: response.data
      }
    } else {
      throw new Error(response.message || "Bounty verification failed")
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('op_underfunded')) {
        throw new Error("Insufficient XLM balance to complete transaction")
      } else if (error.message.includes('User declined')) {
        throw new Error("Transaction cancelled by user")
      } else if (error.message.includes('account not found')) {
        throw new Error("Account not found on Stellar network. Please fund your account first.")
      }
    }
    throw error
  }
}

export async function getAccountBalance(publicKey: string) {
  try {

    const response = await getWalletBalance(publicKey);


    const balances = response.data || [];
    const xlmBalance = balances.find((b: any) => b.asset === "XLM");
    const balance = xlmBalance ? Number.parseFloat(xlmBalance.balance) : 0;


    return balance;
  } catch (error) {
    // Error handled
    // Fallback to mock data - return 0 to show wallet is connected but balance unavailable
    return 0;
  }
}

// New function to create Stellar account via API
export async function createStellarAccount() {
  try {
    const response = await apiCreateStellarAccount();
    return response.data;
  } catch (error) {

    throw error;
  }
}

// Supplier function to send payment to another wallet (e.g., vendor, beneficiary)
// This is used by Suppliers to disburse funds from their wallet
export async function supplierWalletPayment(
  receiverPublicKey: string,
  postId: string,
  amount: number,
  cid: string
) {
  try {
    const payData = {
      PublicKey: receiverPublicKey,
      PostId: postId,
      Amount: amount,
      Cid: cid,
    }

    const response = await walletPay(payData);

    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message || "Supplier payment failed")
    }
  } catch (error) {

    throw error;
  }
}

// Legacy function - kept for backward compatibility
export async function sendPaymentViaAPI(
  senderKey: string,
  receiverKey: string,
  amount: number,
  meta: { cid: string; prevTxn?: string }
) {
  try {
    const response = await sendPayment({
      senderKey,
      receiverKey,
      amount,
      meta,
    });
    return response.data;
  } catch (error) {

    throw error;
  }
}

// ─── Escrow & Community Transactions ─────────────────────────────────

export async function submitEscrowTransaction(
  data: {
    buyerPublicKey: string;
    supplierPublicKey: string;
    totalAmount: number;
    lockedAmount: number; // 50% typically
    taskId: string;
    deadline: number; // Unix timestamp
    asset?: string;
  },
  signTransaction: (tx: string) => Promise<string>
) {
  try {
    // 1. Get Unified XDR from Backend (classic payments + Soroban contract call combined)
    console.log("[STELLAR] Requesting Unified Escrow XDR for task:", data.taskId);
    
    // Fetch latest sequence from Horizon for perfect synchronization
    const { Horizon } = await import('@stellar/stellar-sdk');
    const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
    const account = await horizon.loadAccount(data.buyerPublicKey);
    
    const response = await getEscrowXdr({ ...data, sequence: account.sequence });
    console.log("[STELLAR] Raw Escrow API Response Data:", JSON.stringify(response.data, null, 2));

    if (!response.success || !response.data?.xdr) {
      console.error("[STELLAR] XDR Generation Failed:", response);
      throw new Error(response.message || "Failed to generate Escrow XDRs");
    }
    const { xdr, classicFallback } = response.data;
    console.log(`[STELLAR] Unified XDR received. Soroban Status: ${classicFallback ? '⚠️ skipped (contract unavailable)' : '✅ Active'}`);

    // 2. Sign Unified TX (payments + escrow logging in one popup)
    console.log("[STELLAR] Requesting wallet signature for unified transaction...");
    const signedResult = await signTransaction(xdr);
    const signedXdr = typeof signedResult === 'string'
      ? signedResult
      : (signedResult as any)?.signedTxXdr ?? (signedResult as any)?.txXdr ?? signedResult;
    console.log("[STELLAR] Unified TX signed successfully by wallet");

    // 3. Submit to Backend
    console.log("[STELLAR] Submitting signed transaction to backend...");
    const submitResponse = await submitEscrowTx({ signedXdr });

    if (!submitResponse.success) {
      throw new Error(submitResponse.message || "Backend submission failed");
    }

    console.log("[STELLAR] Backend confirmed transaction(s):", submitResponse.data.hash);

    return {
      success: true,
      hash: submitResponse.data.hash,
      stellarResult: submitResponse.data,
    };

  } catch (error: any) {
    console.error("[STELLAR] Escrow flow failed:", error);
    throw error;
  }
}

export async function submitVoteTransaction(
  data: {
    taskId: string;
    voterWallet: string;
    isScam: boolean;
  },
  signTransaction: (tx: string) => Promise<string>
) {
  try {


    // 1. Get XDR
    const { Horizon } = await import('@stellar/stellar-sdk');
    const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
    const account = await horizon.loadAccount(data.voterWallet);
    
    const response = await getVoteXdr({ ...data, sequence: account.sequence });
    if (!response.success || !response.data?.xdr) {
      throw new Error(response.message || "Failed to generate Vote XDR");
    }
    const xdr = response.data.xdr;

    // 2. Sign
    const signedResult = await signTransaction(xdr);
    const signedXdr = typeof signedResult === 'string'
      ? signedResult
      : (signedResult as any)?.signedTxXdr ?? (signedResult as any)?.txXdr ?? signedResult;

    // 3. Submit to backend (consistent with escrow flow)
    const submitResult = await submitEscrowTx({ signedXdr });
    return { success: true, hash: submitResult.data?.hash };

  } catch (error: any) {
    console.error("[STELLAR] Vote failed:", error);
    throw error;
  }
}

export async function submitProofTransaction(
  data: {
    supplierPublicKey: string;
    taskId: string;
    proofCid: string;
  },
  signTransaction: (tx: string) => Promise<string>
) {
  try {


    // 1. Get XDR
    const { Horizon } = await import('@stellar/stellar-sdk');
    const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
    const account = await horizon.loadAccount(data.supplierPublicKey);
    
    const response = await getSubmitProofXdr({ ...data, sequence: account.sequence });
    if (!response.success || !response.data?.xdr) {
      throw new Error(response.message || "Failed to generate Proof XDR");
    }
    const xdr = response.data.xdr;

    // 2. Sign
    const signedResult = await signTransaction(xdr);
    const signedXdr = typeof signedResult === 'string'
      ? signedResult
      : (signedResult as any)?.signedTxXdr ?? (signedResult as any)?.txXdr ?? signedResult;

    // 3. Submit to backend
    const submitResult = await submitEscrowTx({ signedXdr });
    return { success: true, hash: submitResult.data?.hash };

  } catch (error: any) {
    console.error("[STELLAR] Proof submission failed:", error);
    throw error;
  }
}

/**
 * Creates a trustline for the REI asset.
 */
export async function addTrustline(
  publicKey: string,
  signTransactionThunk: (txXdr: string) => Promise<any>
) {
  try {
    const StellarSdk = await import('@stellar/stellar-sdk');
    const issuer = process.env.NEXT_PUBLIC_REI_ISSUER || "GB5CLXT47BNHNXLR67QSNB5FBM5NTSFSO6IUJCMSO6BY6ZYBTYJGY566";

    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const account = await server.loadAccount(publicKey);
    const asset = new StellarSdk.Asset('REI', issuer);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: asset,
        })
      )
      .setTimeout(180)
      .build();

    const transactionXDR = transaction.toXDR();
    const resultXdr = await signTransactionThunk(transactionXDR);

    // signTransaction thunk returns { payload: signedXdr } or just signedXdr depending on dispatch
    const signedXDR = typeof resultXdr === 'string' ? resultXdr : resultXdr?.payload || resultXdr;

    if (!signedXDR) throw new Error("Failed to sign trustline transaction");

    const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      StellarSdk.Networks.TESTNET
    );

    return await server.submitTransaction(signedTransaction);
  } catch (error) {
    console.error("[STELLAR] Trustline failed:", error);
    throw error;
  }
}
