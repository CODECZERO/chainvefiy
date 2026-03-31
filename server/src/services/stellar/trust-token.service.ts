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

const TRUST_TOKEN_CONTRACT_ID = process.env.TRUST_TOKEN_CONTRACT_ID || '';

export class TrustTokenService {
    private server = server;
    private adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);

    /**
     * Initialize the Trust Token contract.
     */
    async initialize(adminKey: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('initialize', new Address(adminKeypair.publicKey()).toScVal())
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[TrustToken] Initialized: ${result.hash}`);
        return result;
    }

    /**
     * Add an authorized minter.
     */
    async addMinter(adminKey: string, minterAddress: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('add_minter', 
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(minterAddress).toScVal()
            )
        ]);

        tx.sign(adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[TrustToken] Minter added: ${minterAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Remove an authorized minter.
     */
    async removeMinter(adminKey: string, minterAddress: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'remove_minter',
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(minterAddress).toScVal()
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Minter removed: ${minterAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Mint tokens.
     */
    async mint(minterKey: string, toAddress: string, amount: bigint) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const minterKeypair = Keypair.fromSecret(minterKey);
        const sourceAccount = await this.server.getAccount(minterKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'mint',
                new Address(toAddress).toScVal(),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(minterKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Minted ${amount} to ${toAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Burn tokens.
     */
    async burn(ownerKey: string, amount: bigint) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const ownerKeypair = Keypair.fromSecret(ownerKey);
        const sourceAccount = await this.server.getAccount(ownerKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'burn',
                new Address(ownerKeypair.publicKey()).toScVal(),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(ownerKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Burned ${amount} - ${result.hash}`);
        return result;
    }

    /**
     * Transfer tokens.
     */
    async transfer(fromKey: string, toAddress: string, amount: bigint) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const fromKeypair = Keypair.fromSecret(fromKey);
        const sourceAccount = await this.server.getAccount(fromKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'transfer',
                new Address(fromKeypair.publicKey()).toScVal(),
                new Address(toAddress).toScVal(),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(fromKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Transferred ${amount} to ${toAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Approve spending.
     */
    async approve(ownerKey: string, spenderAddress: string, amount: bigint) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const ownerKeypair = Keypair.fromSecret(ownerKey);
        const sourceAccount = await this.server.getAccount(ownerKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'approve',
                new Address(ownerKeypair.publicKey()).toScVal(),
                new Address(spenderAddress).toScVal(),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(ownerKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Approved ${amount} for ${spenderAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Transfer from approved allowance.
     */
    async transferFrom(spenderKey: string, fromAddress: string, toAddress: string, amount: bigint) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const spenderKeypair = Keypair.fromSecret(spenderKey);
        const sourceAccount = await this.server.getAccount(spenderKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'transfer_from',
                new Address(spenderKeypair.publicKey()).toScVal(),
                new Address(fromAddress).toScVal(),
                new Address(toAddress).toScVal(),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(spenderKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Transferred ${amount} from ${fromAddress} to ${toAddress} - ${result.hash}`);
        return result;
    }

    /**
     * Stake tokens.
     */
    async stake(userKey: string, amount: bigint) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const userKeypair = Keypair.fromSecret(userKey);
        const sourceAccount = await this.server.getAccount(userKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'stake',
                new Address(userKeypair.publicKey()).toScVal(),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(userKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Staked ${amount} - ${result.hash}`);
        return result;
    }

    /**
     * Unstake tokens.
     */
    async unstake(userKey: string, amount: bigint) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const userKeypair = Keypair.fromSecret(userKey);
        const sourceAccount = await this.server.getAccount(userKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'unstake',
                new Address(userKeypair.publicKey()).toScVal(),
                nativeToScVal(amount, { type: 'i128' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(userKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Unstaked ${amount} - ${result.hash}`);
        return result;
    }

    /**
     * Claim staking rewards.
     */
    async claimRewards(userKey: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const userKeypair = Keypair.fromSecret(userKey);
        const sourceAccount = await this.server.getAccount(userKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'claim_rewards',
                new Address(userKeypair.publicKey()).toScVal()
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(userKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Rewards claimed - ${result.hash}`);
        return result;
    }

    /**
     * Lock tokens (vesting).
     */
    async lock(adminKey: string, targetAddress: string, amount: bigint, unlockAt: bigint) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const adminKeypair = Keypair.fromSecret(adminKey);
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'lock',
                new Address(adminKeypair.publicKey()).toScVal(),
                new Address(targetAddress).toScVal(),
                nativeToScVal(amount, { type: 'i128' }),
                nativeToScVal(unlockAt, { type: 'u64' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Locked ${amount} until ${unlockAt} - ${result.hash}`);
        return result;
    }

    /**
     * Unlock vested tokens.
     */
    async unlock(userKey: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const userKeypair = Keypair.fromSecret(userKey);
        const sourceAccount = await this.server.getAccount(userKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'unlock',
                new Address(userKeypair.publicKey()).toScVal()
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(userKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        logger.info(`[TrustToken] Unlocked tokens - ${result.hash}`);
        return result;
    }

    /**
     * Get balance.
     */
    async balance(address: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'balance',
                new Address(address).toScVal()
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
     * Get staked amount.
     */
    async staked(address: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'staked',
                new Address(address).toScVal()
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
     * Get total supply.
     */
    async totalSupply() {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('total_supply'))
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
     * Get locked amount.
     */
    async locked(address: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'locked',
                new Address(address).toScVal()
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
     * Get pending staking rewards.
     */
    async pendingRewards(address: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'pending_rewards',
                new Address(address).toScVal()
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
     * Get allowance.
     */
    async allowance(ownerAddress: string, spenderAddress: string) {
        if (!TRUST_TOKEN_CONTRACT_ID) throw new Error('TRUST_TOKEN_CONTRACT_ID not configured');

        const contract = new Contract(TRUST_TOKEN_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'allowance',
                new Address(ownerAddress).toScVal(),
                new Address(spenderAddress).toScVal()
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

export const trustTokenService = new TrustTokenService();
