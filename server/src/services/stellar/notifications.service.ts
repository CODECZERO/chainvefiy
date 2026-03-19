import {
    Contract,
    Address,
    Keypair,
    nativeToScVal,
    scValToNative,
    TransactionBuilder,
    Networks
} from '@stellar/stellar-sdk';
import { server, STACK_ADMIN_SECRET } from './smartContract.handler.stellar.js';

const NOTIFICATIONS_CONTRACT_ID = process.env.NOTIFICATIONS_CONTRACT_ID || '';

export class NotificationsService {
    private server = server;
    private adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);

    async get(id: number | string): Promise<Record<string, unknown> | null> {
        if (!NOTIFICATIONS_CONTRACT_ID) throw new Error('NOTIFICATIONS_CONTRACT_ID not configured');
        const contract = new Contract(NOTIFICATIONS_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());
        const idVal = typeof id === 'string' ? BigInt(id) : BigInt(id);
        const tx = new TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('get', nativeToScVal(idVal, { type: 'u64' })))
            .setTimeout(30)
            .build();
        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);
        const simAny = simulation as any;
        if (simAny.result?.retval) {
            return scValToNative(simAny.result.retval) as Record<string, unknown>;
        }
        return null;
    }

    async listByRecipient(recipientPublicKey: string, limit: number): Promise<unknown[]> {
        if (!NOTIFICATIONS_CONTRACT_ID) throw new Error('NOTIFICATIONS_CONTRACT_ID not configured');
        const contract = new Contract(NOTIFICATIONS_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());
        const tx = new TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'list_by_recipient',
                new Address(recipientPublicKey).toScVal(),
                nativeToScVal(limit, { type: 'u32' })
            ))
            .setTimeout(30)
            .build();
        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);
        const simAny = simulation as any;
        if (simAny.result?.retval) {
            const arr = scValToNative(simAny.result.retval);
            return Array.isArray(arr) ? arr : [];
        }
        return [];
    }

    async count(): Promise<number> {
        if (!NOTIFICATIONS_CONTRACT_ID) throw new Error('NOTIFICATIONS_CONTRACT_ID not configured');
        const contract = new Contract(NOTIFICATIONS_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());
        const tx = new TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('count'))
            .setTimeout(30)
            .build();
        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);
        const simAny = simulation as any;
        if (simAny.result?.retval) {
            const val = scValToNative(simAny.result.retval);
            return typeof val === 'bigint' ? Number(val) : Number(val ?? 0);
        }
        return 0;
    }

    async buildSendTx(senderPublicKey: string, recipientPublicKey: string, message: string): Promise<string> {
        if (!NOTIFICATIONS_CONTRACT_ID) throw new Error('NOTIFICATIONS_CONTRACT_ID not configured');
        const contract = new Contract(NOTIFICATIONS_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(senderPublicKey);
        const tx = new TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'send',
                new Address(senderPublicKey).toScVal(),
                new Address(recipientPublicKey).toScVal(),
                nativeToScVal(message, { type: 'string' })
            ))
            .setTimeout(30)
            .build();
        const preparedTx = await this.server.prepareTransaction(tx);
        return preparedTx.toXDR();
    }
}

export const notificationsService = new NotificationsService();
