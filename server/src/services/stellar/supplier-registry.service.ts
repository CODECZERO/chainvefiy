import {
    Contract,
    Address,
    nativeToScVal,
    scValToNative,
    Keypair,
    TransactionBuilder,
    Networks,
    xdr
} from '@stellar/stellar-sdk';
import { server, horizonServer, STACK_ADMIN_SECRET, adminSequenceManager } from './smartContract.handler.stellar.js';
import logger from '../../util/logger.js';

const SUPPLIER_REGISTRY_CONTRACT_ID = process.env.SUPPLIER_REGISTRY_CONTRACT_ID || '';

export class SupplierRegistryService {
    private server = server;
    private adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);

    /**
     * Initialize the Supplier Registry contract.
     */
    async initialize(adminKey: string): Promise<any> {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('initialize', new Address(adminKeypair.publicKey()).toScVal())
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[SupplierRegistry] Initialized: ${result.hash}`);
        return result;
    }

    /**
     * Register a new supplier.
     */
    async register(
        ownerKey: string,
        name: string,
        category: number,
        rank: string,
        trustScore: number
    ): Promise<any> {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const ownerKeypair = Keypair.fromSecret(ownerKey);
        const sourceAccount = await this.server.getAccount(ownerKeypair.publicKey());

        // Convert rank string to Symbol
        const rankSymbol = xdr.ScVal.scvSymbol(rank);

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('register',
                new Address(ownerKeypair.publicKey()).toScVal(),
                nativeToScVal(name, { type: 'string' }),
                nativeToScVal(category, { type: 'u32' }),
                rankSymbol,
                nativeToScVal(trustScore, { type: 'u32' })
            )
        ]);

        tx.sign(ownerKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[SupplierRegistry] Supplier registered: ${name} - ${result.hash}`);
        return result;
    }

    /**
     * Update trust score.
     */
    async updateTrustScore(ownerKey: string, newTrustScore: number): Promise<any> {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const ownerKeypair = Keypair.fromSecret(ownerKey);
        const sourceAccount = await this.server.getAccount(ownerKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('update_trust_score',
                new Address(ownerKeypair.publicKey()).toScVal(),
                nativeToScVal(newTrustScore, { type: 'u32' })
            )
        ]);

        tx.sign(ownerKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[SupplierRegistry] Trust score updated: ${newTrustScore} - ${result.hash}`);
        return result;
    }

    /**
     * Promote a supplier.
     */
    async promote(adminKey: string, ownerAddress: string, newRank: string): Promise<any> {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const rankSymbol = xdr.ScVal.scvSymbol(newRank);

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('promote',
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(ownerAddress).toScVal(),
                rankSymbol
            )
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[SupplierRegistry] Supplier promoted: ${ownerAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Suspend a supplier.
     */
    async suspend(adminKey: string, ownerAddress: string): Promise<any> {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('suspend',
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(ownerAddress).toScVal()
            )
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[SupplierRegistry] Supplier suspended: ${ownerAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Reinstate a suspended supplier.
     */
    async reinstate(adminKey: string, ownerAddress: string): Promise<any> {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('reinstate',
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(ownerAddress).toScVal()
            )
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[SupplierRegistry] Supplier reinstated: ${ownerAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Set category capacity.
     */
    async setCategoryCapacity(adminKey: string, category: number, capacity: number): Promise<any> {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('set_category_capacity',
                new Address(adminKeypair.publicKey()).toScVal(),
                nativeToScVal(category, { type: 'u32' }),
                nativeToScVal(capacity, { type: 'u32' })
            )
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[SupplierRegistry] Category capacity set: ${category} = ${capacity} - ${result.hash}`);
        return result;
    }

    /**
     * Get supplier details.
     */
    async getSupplier(ownerAddress: string) {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_supplier',
                new Address(ownerAddress).toScVal()
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
     * Get suppliers by category.
     */
    async getByCategory(category: number) {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_by_category',
                nativeToScVal(category, { type: 'u32' })
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
     * Get all suppliers.
     */
    async getAll() {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('get_all'))
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
     * Get trust score history.
     */
    async getTrustHistory(ownerAddress: string) {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_trust_history',
                new Address(ownerAddress).toScVal()
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
     * Get total suppliers count.
     */
    async totalSuppliers() {
        if (!SUPPLIER_REGISTRY_CONTRACT_ID) throw new Error('SUPPLIER_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(SUPPLIER_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('total_suppliers'))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);

        const simAny = simulation as any;
        if (simAny.result?.retval) {
            return scValToNative(simAny.result.retval);
        }
        return 0;
    }
}

export const supplierRegistryService = new SupplierRegistryService();
