import {
    Contract,
    Address,
    nativeToScVal,
    scValToNative,
    Keypair,
    TransactionBuilder,
    Networks
} from '@stellar/stellar-sdk';
import { server, STACK_ADMIN_SECRET } from './smartContract.handler.stellar.js';
import logger from '../../util/logger.js';

const TREASURY_CONTRACT_ID = process.env.TREASURY_CONTRACT_ID || '';

export class TreasuryService {
    private server = server;
    private adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);

    /**
     * Initialize the Treasury contract.
     */
    async initialize(adminKey: string, multiSigThreshold: bigint, requiredApprovals: number) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'initialize',
                new Address(adminKeypair.publicKey()).toScVal(),
                nativeToScVal(multiSigThreshold, { type: 'i128' }),
                nativeToScVal(requiredApprovals, { type: 'u32' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[Treasury] Initialized: ${result.hash}`);
        return result;
    }

    /**
     * Add an authorized signer.
     */
    async addSigner(adminKey: string, signerAddress: string) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'add_signer',
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(signerAddress).toScVal()
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[Treasury] Signer added: ${signerAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Deposit funds.
     */
    async deposit(dividerKey: string, amount: bigint, purpose: string) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const dividerKeypair = Keypair.fromSecret(dividerKey);
        const sourceAccount = await this.server.getAccount(dividerKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'deposit',
                new Address(dividerKeypair.publicKey()).toScVal(),
                nativeToScVal(amount, { type: 'i128' }),
                nativeToScVal(purpose, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(dividerKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[Treasury] Deposited ${amount} - ${result.hash}`);
        return result;
    }

    /**
     * Withdraw funds (creates request if > threshold).
     */
    async withdraw(dividerKey: string, amount: bigint, purpose: string) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const dividerKeypair = Keypair.fromSecret(dividerKey);
        const sourceAccount = await this.server.getAccount(dividerKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'withdraw',
                new Address(dividerKeypair.publicKey()).toScVal(),
                nativeToScVal(amount, { type: 'i128' }),
                nativeToScVal(purpose, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(dividerKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[Treasury] Withdrawal requested: ${amount} - ${result.hash}`);
        return result;
    }

    /**
     * Approve a withdrawal request.
     */
    async approveWithdrawal(signerKey: string, requestId: number) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const signerKeypair = Keypair.fromSecret(signerKey);
        const sourceAccount = await this.server.getAccount(signerKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'approve_withdrawal',
                new Address(signerKeypair.publicKey()).toScVal(),
                nativeToScVal(requestId, { type: 'u32' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(signerKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[Treasury] Withdrawal approved: request ${requestId} - ${result.hash}`);
        return result;
    }

    /**
     * Set budget limit for a division.
     */
    async setBudget(adminKey: string, divisionAddress: string, maxAmount: bigint) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'set_budget',
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(divisionAddress).toScVal(),
                nativeToScVal(maxAmount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[Treasury] Budget set for ${divisionAddress}: ${maxAmount} - ${result.hash}`);
        return result;
    }

    /**
     * Get balance for a divider.
     */
    async getBalance(dividerAddress: string) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_balance',
                new Address(dividerAddress).toScVal()
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);

        const simAny = simulation as any;
        if (simAny.result?.retval) {
            return scValToNative(simAny.result.retval);
        }
        return BigInt(0);
    }

    /**
     * Get transaction history for a divider.
     */
    async getHistory(dividerAddress: string) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_history',
                new Address(dividerAddress).toScVal()
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);

        const simAny = simulation as any;
        if (simAny.result?.retval) {
            return scValToNative(simAny.result.retval);
        }
        return [];
    }

    /**
     * Get withdrawal request details.
     */
    async getRequest(requestId: number) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_request',
                nativeToScVal(requestId, { type: 'u32' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);

        const simAny = simulation as any;
        if (simAny.result?.retval) {
            return scValToNative(simAny.result.retval);
        }
        return null;
    }

    /**
     * Get budget limit for a division.
     */
    async getBudget(divisionAddress: string) {
        if (!TREASURY_CONTRACT_ID) throw new Error('TREASURY_CONTRACT_ID not configured');

        const contract = new Contract(TREASURY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_budget',
                new Address(divisionAddress).toScVal()
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);

        const simAny = simulation as any;
        if (simAny.result?.retval) {
            return scValToNative(simAny.result.retval);
        }
        return BigInt(0);
    }
}

export const treasuryService = new TreasuryService();
