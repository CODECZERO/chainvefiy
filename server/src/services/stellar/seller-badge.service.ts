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

const SELLER_BADGE_CONTRACT_ID = process.env.SELLER_BADGE_CONTRACT_ID || '';

export class SellerBadgeService {
    private server = server;
    private adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);

    /**
     * Initialize the Seller Badge contract.
     */
    async initialize(adminKey: string): Promise<any> {
        if (!SELLER_BADGE_CONTRACT_ID) throw new Error('SELLER_BADGE_CONTRACT_ID not configured');

        const contract = new Contract(SELLER_BADGE_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('initialize', new Address(adminKeypair.publicKey()).toScVal())
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[SellerBadge] Initialized: ${result.hash}`);
        return result;
    }

    /**
     * Mint a badge.
     */
    async mint(sellerAddress: string, productId: string, rank: string): Promise<any> {
        if (!SELLER_BADGE_CONTRACT_ID) throw new Error('SELLER_BADGE_CONTRACT_ID not configured');

        const contract = new Contract(SELLER_BADGE_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('mint',
                new Address(sellerAddress).toScVal(),
                nativeToScVal(productId, { type: 'string' }),
                nativeToScVal(rank, { type: 'string' })
            )
        ]);

        const result = await horizonServer.submitTransaction(tx);
        logger.info(`[SellerBadge] Badge minted for ${sellerAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Revoke a badge.
     */
    async revoke(adminKey: string, sellerAddress: string, productId: string): Promise<any> {
        if (!SELLER_BADGE_CONTRACT_ID) throw new Error('SELLER_BADGE_CONTRACT_ID not configured');

        const contract = new Contract(SELLER_BADGE_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('revoke',
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(sellerAddress).toScVal(),
                nativeToScVal(productId, { type: 'string' })
            )
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[SellerBadge] Badge revoked for ${sellerAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Get all badges for a seller.
     */
    async getBadges(sellerAddress: string) {
        if (!SELLER_BADGE_CONTRACT_ID) throw new Error('SELLER_BADGE_CONTRACT_ID not configured');

        const contract = new Contract(SELLER_BADGE_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_badges',
                new Address(sellerAddress).toScVal()
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
     * Verify badge exists.
     */
    async verifyBadge(sellerAddress: string, productId: string) {
        if (!SELLER_BADGE_CONTRACT_ID) throw new Error('SELLER_BADGE_CONTRACT_ID not configured');

        const contract = new Contract(SELLER_BADGE_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'verify_badge',
                new Address(sellerAddress).toScVal(),
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
        return false;
    }

    /**
     * Get badge count for a seller.
     */
    async badgeCount(sellerAddress: string) {
        if (!SELLER_BADGE_CONTRACT_ID) throw new Error('SELLER_BADGE_CONTRACT_ID not configured');

        const contract = new Contract(SELLER_BADGE_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'badge_count',
                new Address(sellerAddress).toScVal()
            ))
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

    /**
     * Get total badges minted.
     */
    async totalBadges() {
        if (!SELLER_BADGE_CONTRACT_ID) throw new Error('SELLER_BADGE_CONTRACT_ID not configured');

        const contract = new Contract(SELLER_BADGE_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('total_badges'))
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

    /**
     * Get top sellers leaderboard.
     */
    async getTopSellers(limit: number) {
        if (!SELLER_BADGE_CONTRACT_ID) throw new Error('SELLER_BADGE_CONTRACT_ID not configured');

        const contract = new Contract(SELLER_BADGE_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_top_sellers',
                nativeToScVal(limit, { type: 'u32' })
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

export const sellerBadgeService = new SellerBadgeService();
