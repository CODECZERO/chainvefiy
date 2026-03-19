import {
    Contract,
    xdr,
    Address,
    nativeToScVal,
    scValToNative,
    Keypair,
    TransactionBuilder,
    Networks,
    TimeoutInfinite
} from '@stellar/stellar-sdk';
import { server, STACK_ADMIN_SECRET } from './smartContract.handler.stellar.js';

// This will be set after deployment
const ESCROW_CONTRACT_ID = process.env.ESCROW_CONTRACT_ID || '';

export class EscrowService {
    private server = server;
    private adminKeypair: any;

    private getAdminKeypair() {
        if (!STACK_ADMIN_SECRET) throw new Error('STACK_ADMIN_SECRET not configured');
        if (!this.adminKeypair) this.adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);
        return this.adminKeypair;
    }

    /**
     * Create an Escrow: Locks funds on-chain.
     * Helper to build the transaction XDR for the frontend to sign.
     */
    async buildCreateEscrowTx(
        donorPublicKey: string,
        ngoPublicKey: string,
        totalAmount: number,
        lockedAmount: number,
        taskId: string,
        deadline: number
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(donorPublicKey);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'create_escrow',
                new Address(donorPublicKey).toScVal(),
                new Address(ngoPublicKey).toScVal(),
                nativeToScVal(BigInt(Math.round(totalAmount)), { type: 'i128' }),
                nativeToScVal(BigInt(Math.round(lockedAmount)), { type: 'i128' }),
                nativeToScVal(taskId, { type: 'string' }),
                nativeToScVal(BigInt(deadline), { type: 'u64' })
            ))
            .setTimeout(180)
            .build();

        try {
            const preparedTx = await this.server.prepareTransaction(tx);
            return preparedTx.toXDR();
        } catch (prepareError: any) {
            const errMsg = prepareError?.message || String(prepareError);
            if (errMsg.includes('UnreachableCodeReached') || errMsg.includes('InvalidAction')) {
                throw new Error(
                    'Escrow contract unavailable — the contract may not be initialized or the WASM binary is outdated. ' +
                    'Please redeploy and call initialize(). Original: ' + errMsg
                );
            }
            throw prepareError;
        }
    }

    /**
     * Submit Proof: NGO calls this.
     */
    async buildSubmitProofTx(
        ngoPublicKey: string,
        taskId: string,
        proofCid: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(ngoPublicKey);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'submit_proof',
                nativeToScVal(taskId, { type: 'string' }),
                nativeToScVal(proofCid, { type: 'string' })
            ))
            .setTimeout(180)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        return preparedTx.toXDR();
    }

    /**
     * Vote: Community member calls this.
     */
    async buildVoteTx(
        voterPublicKey: string,
        taskId: string,
        isScam: boolean
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(voterPublicKey);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'vote',
                nativeToScVal(taskId, { type: 'string' }),
                new Address(voterPublicKey).toScVal(),
                nativeToScVal(isScam, { type: 'bool' })
            ))
            .setTimeout(180)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        return preparedTx.toXDR();
    }

    /**
     * Release: Admin/Server calls this after verification.
     */
    async releaseEscrow(taskId: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const adminKeypair = this.getAdminKeypair();
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'release',
                nativeToScVal(taskId, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        return result;
    }

    /**
     * Dispute: Admin/Server calls this if scam detected.
     */
    async disputeEscrow(taskId: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const adminKeypair = this.getAdminKeypair();
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'dispute',
                nativeToScVal(taskId, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        return result;
    }

    /**
     * Refund: Admin/Server calls this after dispute lock period expires.
     */
    async refundEscrow(taskId: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const adminKeypair = this.getAdminKeypair();
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'refund',
                nativeToScVal(taskId, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);
        const result = await this.server.sendTransaction(preparedTx);

        return result;
    }

    /**
     * Query escrow details by task ID.
     */
    async getEscrow(taskId: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const adminKeypair = this.getAdminKeypair();
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_escrow',
                nativeToScVal(taskId, { type: 'string' })
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
     * Get all escrows for an NGO.
     */
    async getNgoEscrows(ngoPublicKey: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_ngo_escrows',
                new Address(ngoPublicKey).toScVal()
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
     * Get all escrows for a donor.
     */
    async getDonorEscrows(donorPublicKey: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_donor_escrows',
                new Address(donorPublicKey).toScVal()
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
     * Get votes for a specific escrow.
     */
    async getVotes(taskId: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_votes',
                nativeToScVal(taskId, { type: 'string' })
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
     * Get voter accuracy stats.
     */
    async getVoterStats(voterPublicKey: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_voter_stats',
                new Address(voterPublicKey).toScVal()
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
     * Get global platform statistics.
     */
    async getPlatformStats() {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('get_platform_stats'))
            .setTimeout(30)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        const simulation = await this.server.simulateTransaction(preparedTx);

        const simAny = simulation as any;
        if (simAny.result?.retval) {
            return scValToNative(simAny.result.retval);
        }
        return { locked: 0, released: 0, refunded: 0 };
    }
}

export const escrowService = new EscrowService();
