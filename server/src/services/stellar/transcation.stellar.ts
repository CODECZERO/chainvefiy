import { STELLAR_CONFIG } from './config.stellar.js';
import {
  Keypair,
  TransactionBuilder,
  Operation,
  Memo,
  Asset,
  BASE_FEE,
} from '@stellar/stellar-sdk';

export interface WalletToWallet {
  senderKey: string;
  receiverKey: string;
  amount: number;
  meta: {
    cid: string;
    prevTxn?: string;
  };
}

interface PaymentResult {
  success: boolean;
  hash?: string;
  ledger?: number;
  error?: string;
}

//you need to add code for saving it or using smart contract
// on both places

/**
 * Get balance for a user's wallet
 */
const getBalance = async (publicKey: string) => {
  try {
    const account = await STELLAR_CONFIG.server.loadAccount(publicKey);

    console.log(`\n=== Balance for ${publicKey} ===`);

    const balances = account.balances.map((balance: any) => {
      if (balance.asset_type === 'native') {
        console.log(`XLM: ${balance.balance}`);
        return {
          asset: 'XLM',
          balance: balance.balance,
        };
      } else {
        console.log(`${balance.asset_code}: ${balance.balance} (Issuer: ${balance.asset_issuer})`);
        return {
          asset: balance.asset_code,
          balance: balance.balance,
          issuer: balance.asset_issuer,
        };
      }
    });

    return balances;
  } catch (error: any) {
    console.error('Error fetching balance:', error.message);
    throw error;
  }
};

/**
 * Send XLM payment from one wallet to another
 */
const sendPaymentToWallet = async (walletData: WalletToWallet): Promise<PaymentResult> => {
  try {
    const { senderKey, receiverKey, amount, meta } = walletData;
    const senderKeypair = Keypair.fromSecret(senderKey);
    const senderPublicKey = senderKeypair.publicKey();

    // Load sender account
    const senderAccount = await STELLAR_CONFIG.server.loadAccount(senderPublicKey);

    const getBalancedata = await getBalance(senderPublicKey);
    const xlmBalance = getBalancedata.find((b) => b.asset === 'XLM');
    console.log(xlmBalance);
    // Convert string to number
    const balanceAsNumber = parseFloat(xlmBalance?.balance); // 123.456
    if (balanceAsNumber <= 0) throw new Error('Insufficient balance for transaction');

    // Build payment transaction
    const transaction = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_CONFIG.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: receiverKey,
          asset: Asset.native(),
          amount: amount.toString(),
        })
      )
      .addMemo(Memo.text('Expense'))
      .setTimeout(30)
      .build();

    // Sign transaction
    transaction.sign(senderKeypair);
    // Submit transaction
    const result = await STELLAR_CONFIG.server.submitTransaction(transaction);

    return {
      success: true,
      hash: result.hash,
      ledger: result.ledger,
    };
  } catch (error: any) {
    console.error('✗ Payment failed:', error.message);

    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }

    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
};

const verfiyTransaction = async (TransactionId: string): Promise<any> => {
  try {
    const transaction = await STELLAR_CONFIG.server
      .transactions()
      .transaction(TransactionId)
      .call();
    return transaction;
  } catch (error) {
    console.error(`[STELLAR] Transaction ${TransactionId} not found or failed:`, error);
    return null;
  }
};

const getTransactionData = async (TransactionId: string) => { };
export { sendPaymentToWallet, getBalance, verfiyTransaction };
