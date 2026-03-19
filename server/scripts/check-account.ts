import {
    Keypair,
    rpc
} from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const server = new rpc.Server(process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org');
const ADMIN_SECRET = process.env.STACK_ADMIN_SECRET || '';

async function checkAccount() {
    if (!ADMIN_SECRET) {
        console.error('STACK_ADMIN_SECRET not found');
        return;
    }

    const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);

    try {
        console.log(`Checking account: ${adminKeypair.publicKey()}`);
        const account = await server.getAccount(adminKeypair.publicKey());
        console.log(`Account found! Sequence: ${account.sequenceNumber()}`);
    } catch (error: any) {
        console.error('❌ Failed to check account:', error.message);
    }
}

checkAccount();
