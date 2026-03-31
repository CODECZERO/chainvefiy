import {
    Contract,
    Address,
    nativeToScVal,
    scValToNative,
    Keypair,
    TransactionBuilder,
    Networks
} from '@stellar/stellar-sdk';
import { server, horizonServer, STACK_ADMIN_SECRET, adminSequenceManager } from './smartContract.handler.stellar.js';
import logger from '../../util/logger.js';

const PRODUCT_REGISTRY_CONTRACT_ID = process.env.PRODUCT_REGISTRY_CONTRACT_ID || '';

export class ProductRegistryService {
    private server = server;
    private adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);

    /**
     * Initialize the Product Registry contract.
     */
    async initialize(adminKey: string) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('initialize', new Address(adminKeypair.publicKey()).toScVal())
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[ProductRegistry] Initialized: ${result.hash}`);
        return result;
    }

    /**
     * Set the badge contract address.
     */
    async setBadgeContract(adminKey: string, badgeContractAddress: string) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('set_badge_contract', 
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(badgeContractAddress).toScVal()
            )
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[ProductRegistry] Badge contract set: ${result.hash}`);
        return result;
    }

    /**
     * Set the token contract address.
     */
    async setTokenContract(adminKey: string, tokenContractAddress: string) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('set_token_contract',
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(tokenContractAddress).toScVal()
            )
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[ProductRegistry] Token contract set: ${result.hash}`);
        return result;
    }

    /**
     * Register a new product.
     */
    async registerProduct(
        supplierKey: string,
        productId: string,
        title: string,
        riskLevel: number,
        deadline?: number
    ) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const deadlineValue = deadline || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const supplierKeypair = Keypair.fromSecret(supplierKey);
        const sourceAccount = await this.server.getAccount(supplierKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'register_product',
                new Address(supplierKeypair.publicKey()).toScVal(),
                nativeToScVal(productId, { type: 'string' }),
                nativeToScVal(title, { type: 'string' }),
                nativeToScVal(riskLevel, { type: 'u32' }),
                nativeToScVal(BigInt(deadlineValue), { type: 'u64' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(supplierKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[ProductRegistry] Product registered: ${productId} - ${result.hash}`);
        return result;
    }

    /**
     * Advance product status: Active → InProgress → Review
     */
    async advanceStatus(supplierKey: string, productId: string) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const supplierKeypair = Keypair.fromSecret(supplierKey);
        const sourceAccount = await this.server.getAccount(supplierKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'advance_status',
                new Address(supplierKeypair.publicKey()).toScVal(),
                nativeToScVal(productId, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(supplierKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[ProductRegistry] Status advanced for product: ${productId} - ${result.hash}`);
        return result;
    }

    /**
     * Verify a product with proof.
     */
    async verifyProof(
        validatorKey: string,
        sellerAddress: string,
        productId: string,
        proofCid: string
    ) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const validatorKeypair = Keypair.fromSecret(validatorKey);
        const sourceAccount = await this.server.getAccount(validatorKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'verify_proof',
                new Address(validatorKeypair.publicKey()).toScVal(),
                new Address(sellerAddress).toScVal(),
                nativeToScVal(productId, { type: 'string' }),
                nativeToScVal(proofCid, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(validatorKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[ProductRegistry] Proof verified for product: ${productId} - ${result.hash}`);
        return result;
    }

    /**
     * Mark a product as failed.
     */
    async failProduct(callerKey: string, productId: string) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const callerKeypair = Keypair.fromSecret(callerKey);
        const sourceAccount = await this.server.getAccount(callerKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'fail_product',
                new Address(callerKeypair.publicKey()).toScVal(),
                nativeToScVal(productId, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(callerKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[ProductRegistry] Product failed: ${productId} - ${result.hash}`);
        return result;
    }

    /**
     * Query product details.
     */
    async getProduct(productId: string) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_product',
                nativeToScVal(productId, { type: 'string' })
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
     * Get product proof.
     */
    async getProof(productId: string) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_proof',
                nativeToScVal(productId, { type: 'string' })
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
     * Get product counter statistics.
     */
    async getCounter() {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('get_counter'))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);

        const simAny = simulation as any;
        if (simAny.result?.retval) {
            return scValToNative(simAny.result.retval);
        }
        return { total: 0, active: 0, verified: 0, failed: 0 };
    }

    /**
     * Get products by supplier.
     */
    async getProductsBySupplier(supplierAddress: string) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_products_by_supplier',
                new Address(supplierAddress).toScVal()
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
     * Get validators who verified a product.
     */
    async getValidators(productId: string) {
        if (!PRODUCT_REGISTRY_CONTRACT_ID) throw new Error('PRODUCT_REGISTRY_CONTRACT_ID not configured');

        const contract = new Contract(PRODUCT_REGISTRY_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_validators',
                nativeToScVal(productId, { type: 'string' })
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
}

export const productRegistryService = new ProductRegistryService();
