import {
    Keypair,
    Contract,
    Address,
    nativeToScVal,
    TransactionBuilder,
    Networks,
    rpc
} from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const server = new rpc.Server(process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

const ADMIN_SECRET = process.env.STACK_ADMIN_SECRET || '';
const SAC_ID = 'CASXOT3CIMXKKENXZY5VFU7QPREPNGMV6JRDBQRHJGCBE5PQW67BVHGR';
const USER_ADDRESS = 'GB5GF6YMRVW43J7HYLFBDNM4J6ODLB4I74RBB3FV3AVFDZ36FN7JGKRF';

async function testMint() {
    if (!ADMIN_SECRET) {
        console.error('STACK_ADMIN_SECRET not found');
        return;
    }

    const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);
    const contract = new Contract(SAC_ID);

    try {
        console.log(`🚀 Starting Mint Test...`);
        const account = await server.getAccount(adminKeypair.publicKey());
        console.log(`Account sequence: ${account.sequenceNumber()}`);

        const tx = new TransactionBuilder(account, {
            fee: "1000",
            networkPassphrase
        })
            .addOperation(contract.call(
                'mint',
                new Address(USER_ADDRESS).toScVal(),
                nativeToScVal(5000000000n, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();

        console.log(`Preparing...`);
        let preparedTx;
        try {
            preparedTx = await server.prepareTransaction(tx);
        } catch (prepError: any) {
            console.error('Preparation failed:', JSON.stringify(prepError.response?.data || prepError.message, null, 2));
            return;
        }

        preparedTx.sign(adminKeypair);

        console.log(`Sending...`);
        const result = await server.sendTransaction(preparedTx);
        console.log(`Send Status: ${result.status}`);

        if ((result as any).errorResult) {
            console.error(`Error Result XDR: ${(result as any).errorResult}`);
        }

        if ((result.status as any) === 'PENDING' || (result.status as any) === 'SUCCESS') {
            console.log(`Waiting for confirmation...`);
            let txResponse = await server.getTransaction(result.hash);
            while ((txResponse.status as any) === 'NOT_FOUND' || (txResponse.status as any) === 'PENDING') {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                txResponse = await server.getTransaction(result.hash);
            }
            console.log(`Final Result: ${JSON.stringify(txResponse, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)}`);
        }
    } catch (error: any) {
        console.error('❌ Unexpected Error:', error);
    }
}

testMint();
