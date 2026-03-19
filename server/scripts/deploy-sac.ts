import {
    Keypair,
    Asset,
    Operation,
    TransactionBuilder,
    Networks,
    rpc,
    Horizon
} from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const rpcServer = new rpc.Server(process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

const ADMIN_SECRET = process.env.STACK_ADMIN_SECRET || '';

async function deploySac() {
    if (!ADMIN_SECRET) {
        console.error('STACK_ADMIN_SECRET not found');
        return;
    }

    const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);
    const asset = new Asset('REI', adminKeypair.publicKey());

    try {
        console.log(`🚀 Deploying SAC for REI asset...`);
        const account = await server.loadAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(account, {
            fee: "1000",
            networkPassphrase
        })
            .addOperation(Operation.createStellarAssetContract({ asset }))
            .setTimeout(30)
            .build();

        console.log(`Preparing via RPC...`);
        const preparedTx = await rpcServer.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);

        console.log(`Sending...`);
        const result = await rpcServer.sendTransaction(preparedTx);
        console.log(`Result: ${result.status}`);

        if (result.status === 'PENDING' || result.status === 'SUCCESS') {
            console.log(`Waiting for confirmation...`);
            let txResponse = await rpcServer.getTransaction(result.hash);
            while (txResponse.status === 'NOT_FOUND' || txResponse.status === 'PENDING') {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                txResponse = await rpcServer.getTransaction(result.hash);
            }
            console.log(`Final Result status: ${txResponse.status}`);
            if (txResponse.status === 'SUCCESS') {
                console.log(`✅ SAC Deployed successfully!`);
                // Return the contract ID
                console.log(`Contract ID: ${asset.contractId(Networks.TESTNET)}`);
            }
        }
    } catch (error: any) {
        console.error('❌ Deployment failed:', error);
    }
}

deploySac();
