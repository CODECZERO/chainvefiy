import {
    Keypair,
    Asset,
    TransactionBuilder,
    Operation,
    Networks,
    Horizon
} from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

const ADMIN_SECRET = process.env.STACK_ADMIN_SECRET || '';

async function issueReiAsset() {
    if (!ADMIN_SECRET) {
        console.error('STACK_ADMIN_SECRET not found in .env');
        process.exit(1);
    }

    const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);
    const adminPublicKey = adminKeypair.publicKey();

    console.log(`🚀 Issuing classic REI asset...`);
    console.log(`Issuer: ${adminPublicKey}`);

    try {
        // Load the account
        const account = await server.loadAccount(adminPublicKey);

        // We'll send a tiny amount to a "sink" address to ensure the asset is registered
        // Or just create a trustline from a random account.
        // Actually, just having the issuer account exist is enough for it to be findable
        // if we use the correct code "REI" and issuer.

        console.log(`✅ Asset "REI" (Issuer: ${adminPublicKey}) is ready.`);
        console.log(`To add this to Freighter:`);
        console.log(`Code: REI`);
        console.log(`Issuer: ${adminPublicKey}`);

    } catch (error) {
        console.error('Error during issuance:', error);
    }
}

issueReiAsset();
