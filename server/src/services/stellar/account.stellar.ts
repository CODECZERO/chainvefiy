import { STELLAR_CONFIG, createKeypair } from './config.stellar.js';
import { TransactionBuilder, Operation, Keypair, Account, xdr } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
dotenv.config();

//this function take's admin private key to fund , new account which are ngo via doing that
//it create's new account on blockchain
export const createAccount = async () => {
  // Read the admin secret key from environment
  const baseAccountKey = process.env.STACK_ADMIN_SECRET;

  if (!baseAccountKey) {
    throw new Error('STACK_ADMIN_SECRET environment variable is not set. Please set it in server/.env');
  }

  console.log('Using base account key:', baseAccountKey.substring(0, 10) + '...');

  try {
    const funderKey = Keypair.fromSecret(baseAccountKey);
    console.log('Funder public key:', funderKey.publicKey());

    // Check if the funder account exists and has sufficient balance
    let funderAccountDetail;
    try {
      funderAccountDetail = await STELLAR_CONFIG.server
        .accounts()
        .accountId(funderKey.publicKey())
        .call();
      console.log('Funder account balance:', funderAccountDetail.balances);
    } catch (error) {
      console.error('Error fetching funder account:', error);
      throw new Error(
        `Funder account not found or not funded. Please fund the account ${funderKey.publicKey()} with test XLM at https://www.stellar.org/laboratory/#account-creator`
      );
    }

    const newPair = createKeypair();
    console.log('New account public key:', newPair.publicKey());

    // Get the base fee
    const baseFee = await STELLAR_CONFIG.server.fetchBaseFee();
    console.log('Base fee:', baseFee);

    // Use the account directly without complex sequence handling
    const funderAccount = new Account(funderKey.publicKey(), funderAccountDetail.sequence);
    console.log('Using account sequence:', funderAccountDetail.sequence);

    const tx = new TransactionBuilder(funderAccount, {
      fee: baseFee.toString(),
      networkPassphrase: STELLAR_CONFIG.networkPassphrase,
    })
      .addOperation(
        Operation.createAccount({
          destination: newPair.publicKey(),
          startingBalance: '2', // Set to 2 XLM
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(funderKey);
    console.log('Transaction built and signed');

    try {
      // Try regular submitTransaction first (more reliable)
      const result = await STELLAR_CONFIG.server.submitTransaction(tx);
      console.log('Transaction result:', result);

      if (result.successful) {
        console.log(`✅ Successfully created Stellar account: ${newPair.publicKey()}`);
        return {
          publicKey: newPair.publicKey(),
          secret: newPair.secret(),
        };
      } else {
        console.error('Transaction failed details:', result);
        throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
      }
    } catch (submitError: any) {
      console.error('Transaction submission error:', submitError.message);
      console.error('Error response:', submitError.response?.data);
      console.error('Error status:', submitError.response?.status);

      // Try to get more details about the transaction failure
      if (submitError.response?.data?.extras) {
        console.error('Transaction failure details:', submitError.response.data.extras);
      }

      // Decode the error XDR
      if (submitError.response?.data?.error_result_xdr) {
        try {
          const errorXdr = submitError.response.data.error_result_xdr;
          console.error('Error XDR:', errorXdr);
          const decodedError = xdr.TransactionResult.fromXDR(errorXdr, 'base64');
          console.error('Decoded error:', decodedError);
        } catch (decodeError) {
          console.error('Could not decode error XDR:', decodeError);
        }
      }

      throw new Error(`Transaction submission failed: ${submitError.message}`);
    }
  } catch (error) {
    console.error('Error creating Stellar account:', error);
    throw error;
  }
};

//destination is the public key that will receive the remaining native balance
export const DeletAccount = async (secret: string, destination: string) => {
  const keypair = Keypair.fromSecret(secret);
  const Account = await STELLAR_CONFIG.server.loadAccount(keypair.publicKey());

  const tx = new TransactionBuilder(Account, {
    fee: (await STELLAR_CONFIG.server.fetchBaseFee()).toString(),
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(Operation.accountMerge({ destination }))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  await STELLAR_CONFIG.server.submitAsyncTransaction(tx);
};

// those two upper code are wrong , they are for testnet or horizon , make them for Futurenet(correct one , as soroban is need for it)
