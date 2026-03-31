import * as StellarSdk from '@stellar/stellar-sdk';
import { Server } from '@stellar/stellar-sdk/rpc';
import dotenv from 'dotenv';
import logger from '../../util/logger.js';

dotenv.config();

// Initialize server with Soroban testnet
export const server = new StellarSdk.rpc.Server(process.env.SOROBAN_RPC_URL as string);
export const horizonServer = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
export const STACK_ADMIN_SECRET = (() => {
  const secret = process.env.STACK_ADMIN_SECRET || "";
  if (!secret) {
    const kp = StellarSdk.Keypair.random();
    logger.warn('[SC] STACK_ADMIN_SECRET missing; using ephemeral keypair for boot');
    return kp.secret();
  }
  try {
    // Validate format early so the app can boot with a fallback.
    StellarSdk.Keypair.fromSecret(secret);
    return secret;
  } catch (e: any) {
    const kp = StellarSdk.Keypair.random();
    logger.warn('[SC] STACK_ADMIN_SECRET invalid; using ephemeral keypair for boot', { error: e?.message || String(e) });
    return kp.secret();
  }
})();

interface UserDataWallet {
  privateKey: string;
  amount: number;
  cid: string;
  prevTxn: string;
  metadata?: string | null;
  contractId?: string; // Optional override
}

export async function saveContractWithWallet(userData: UserDataWallet) {
  try {
    const contractId = userData.contractId || process.env.CONTRACT_ID;
    if (!contractId) {
      throw new Error('CONTRACT_ID is not defined in environment variables');
    }

    const contract = new StellarSdk.Contract(contractId);
    const sourceKeypair = StellarSdk.Keypair.fromSecret(userData.privateKey);
    const accountId = sourceKeypair.publicKey();
    const account = await server.getAccount(accountId);
    const fee = StellarSdk.BASE_FEE;

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .setTimeout(30)
      .addOperation(
        contract.call(
          'store_data',
          StellarSdk.nativeToScVal(accountId, { type: 'address' }),
          StellarSdk.nativeToScVal(userData.amount, { type: 'i128' }),
          StellarSdk.nativeToScVal(userData.cid, { type: 'string' }),
          StellarSdk.nativeToScVal(userData.prevTxn || 'no txn', { type: 'string' }),
          userData.metadata
            ? StellarSdk.nativeToScVal(userData.metadata, { type: 'string' })
            : StellarSdk.xdr.ScVal.scvVoid()
        )
      )
      .build();

    const preparedTx = await server.prepareTransaction(transaction);
    preparedTx.sign(sourceKeypair);

    const result = await server.sendTransaction(preparedTx);
    logger.info(`[SC] Store Data tx: hash=${result.hash} status=${result.status}`);

    // Wait for transaction confirmation
    if (result.status === 'PENDING') {
      let txResponse = await server.getTransaction(result.hash);
      while (txResponse.status === 'NOT_FOUND') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        txResponse = await server.getTransaction(result.hash);
      }
      logger.info(`[SC] Store Data final status: ${txResponse.status}`);
      return txResponse;
    }

    return result;
  } catch (error) {
    logger.error(`[SC] Error storing data: ${error}`);
    throw error;
  }
}

export async function getLatestData(privateKey: string, contractId?: string) {
  try {
    const activeContractId = contractId || process.env.CONTRACT_ID;
    if (!activeContractId) {
      throw new Error('CONTRACT_ID is not defined in environment variables');
    }

    const contract = new StellarSdk.Contract(activeContractId);
    const sourceKeypair = StellarSdk.Keypair.fromSecret(privateKey);
    const accountId = sourceKeypair.publicKey();
    const account = await server.getAccount(accountId);
    const fee = StellarSdk.BASE_FEE;

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .setTimeout(30)
      .addOperation(
        contract.call('get_latest', StellarSdk.nativeToScVal(accountId, { type: 'address' }))
      )
      .build();

    const preparedTx = await server.prepareTransaction(transaction);
    const simulation = await server.simulateTransaction(preparedTx);

    // Extract ScVal — handle both results[0].xdr and result.retval patterns
    let returnValue: StellarSdk.xdr.ScVal | null = null;
    const resultXdr = (simulation as any).results?.[0]?.xdr;
    if (resultXdr) {
      returnValue = StellarSdk.xdr.ScVal.fromXDR(resultXdr, 'base64');
    } else if ((simulation as any).result?.retval) {
      returnValue = (simulation as any).result.retval;
    }

    if (!returnValue) {
      logger.info('[SC] getLatestData: No data found in simulation');
      return null;
    }

    logger.info('[SC] getLatestData: Got return value');

    // Parse the XDR response if needed
    if (returnValue.switch() === StellarSdk.xdr.ScValType.scvMap()) {
      const data: Record<string, any> = {};
      const map = returnValue.map();
      if (map) {
        for (const entry of map) {
          const key = entry.key().str()?.toString() || entry.key().sym()?.toString() || 'unknown';
          const val = entry.val();
          if (val.switch) {
            switch (val.switch().name) {
              case 'scvBool':
                data[key] = val.value();
                break;
              case 'scvU32':
              case 'scvI32':
              case 'scvU64':
              case 'scvI64':
              case 'scvU128':
              case 'scvI128':
                const value = val.value();
                data[key] = value !== null && value !== undefined ? value.toString() : '';
                break;
              case 'scvString':
                data[key] = val.str()?.toString() || '';
                break;
              case 'scvSymbol':
                data[key] = val.sym()?.toString() || '';
                break;
              default:
                data[key] = 'Unsupported type: ' + val.switch().name;
            }
          }
        }
        return data;
      }
    }
    return { value: returnValue };
  } catch (error) {
    logger.error(`[SC] Error fetching data: ${error}`);
    throw error;
  }
}

export async function registerProduct(
  supplierKey: string,
  productId: string,
  title: string,
  riskLevel: number,
  deadline?: number
) {
  try {
    const contractId = process.env.PRODUCT_REGISTRY_CONTRACT_ID;
    if (!contractId) {
      throw new Error('PRODUCT_REGISTRY_CONTRACT_ID is not defined');
    }

    // Default deadline: 30 days from now (in seconds)
    const deadlineValue = deadline || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    const contract = new StellarSdk.Contract(contractId);
    const sourceKeypair = StellarSdk.Keypair.fromSecret(supplierKey);
    const accountId = sourceKeypair.publicKey();
    const account = await server.getAccount(accountId);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .setTimeout(30)
      .addOperation(
        contract.call(
          'register_product',
          StellarSdk.nativeToScVal(accountId, { type: 'address' }),
          StellarSdk.nativeToScVal(productId, { type: 'string' }),
          StellarSdk.nativeToScVal(title, { type: 'string' }),
          StellarSdk.nativeToScVal(riskLevel, { type: 'u32' }),
          StellarSdk.nativeToScVal(BigInt(deadlineValue), { type: 'u64' })
        )
      )
      .build();

    const preparedTx = await server.prepareTransaction(transaction);
    preparedTx.sign(sourceKeypair);
    const result = await server.sendTransaction(preparedTx);
    logger.info(`[SC] registerProduct tx: hash=${result.hash} status=${result.status}`);
    return result;
  } catch (error) {
    logger.error(`[SC] Error registering product: ${error}`);
    throw error;
  }
}

export async function verifyProductProof(validatorKey: string, sellerAddress: string, productId: string, proofCid: string) {
  try {
    const contractId = process.env.PRODUCT_REGISTRY_CONTRACT_ID;
    if (!contractId) {
      throw new Error('PRODUCT_REGISTRY_CONTRACT_ID is not defined');
    }

    const contract = new StellarSdk.Contract(contractId);
    const sourceKeypair = StellarSdk.Keypair.fromSecret(validatorKey);
    const accountId = sourceKeypair.publicKey();
    const account = await server.getAccount(accountId);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .setTimeout(30)
      .addOperation(
        contract.call(
          'verify_proof',
          StellarSdk.nativeToScVal(accountId, { type: 'address' }),
          StellarSdk.nativeToScVal(sellerAddress, { type: 'address' }),
          StellarSdk.nativeToScVal(productId, { type: 'string' }),
          StellarSdk.nativeToScVal(proofCid, { type: 'string' })
        )
      )
      .build();

    const preparedTx = await server.prepareTransaction(transaction);
    preparedTx.sign(sourceKeypair);
    const result = await server.sendTransaction(preparedTx);
    logger.info(`[SC] verifyProductProof tx: hash=${result.hash} status=${result.status}`);
    return result;
  } catch (error) {
    logger.error(`[SC] Error verifying product proof: ${error}`);
    throw error;
  }
}
