import {
    Contract,
    xdr,
    Address,
    nativeToScVal,
    scValToNative,
    Keypair,
    TransactionBuilder,
    Networks,
    TimeoutInfinite,
    Asset,
    Operation,
    Account
} from '@stellar/stellar-sdk';
import { server, horizonServer, STACK_ADMIN_SECRET, adminSequenceManager } from './smartContract.handler.stellar.js';
import { ApiError } from '../../util/apiError.util.js';

const ESCROW_CONTRACT_ID = process.env.ESCROW_CONTRACT_ID || '';
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD67VEE7LCOW763YF6XOS67D6FEP6W6DIP7CUEI2Z2Z2BD3C3C3C3C';
const USDT_ISSUER = process.env.USDT_ISSUER || 'GC5LLE3Z765S4ZWVGBO6W4UYFUXZ6PFYI5S6W6S6W6S6W6S6W6S6W6S6'; // Mock or real USDT issuer

const ASSET_CONFIG: Record<string, { code: string; issuer: string }> = {
    USDC: { code: 'USDC', issuer: USDC_ISSUER },
    USDT: { code: 'USDT', issuer: USDT_ISSUER },
};

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
        buyerPublicKey: string,
        supplierPublicKey: string,
        totalAmount: number,
        lockedAmount: number,
        taskId: string,
        deadline: number,
        asset?: string,
        sequence?: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);

        // 1. Load account from Horizon to get the MOST RELIABLE sequence number
        // If frontend provided a sequence, use it; otherwise fetch from Horizon
        const seq = sequence || (await horizonServer.loadAccount(buyerPublicKey)).sequence;
        const sourceAccount = new Account(buyerPublicKey, seq);

        // Assets
        const assetCode = (asset || 'USDC').toUpperCase();
        const isXlm = assetCode === 'XLM';
        
        let stellarAsset: Asset;
        if (isXlm) {
            stellarAsset = Asset.native();
        } else {
            const config = ASSET_CONFIG[assetCode];
            if (!config) throw new Error(`Unsupported asset: ${assetCode}. Only USDC, USDT, XLM supported.`);
            stellarAsset = new Asset(config.code, config.issuer);
        }

        const directAmount = (totalAmount - lockedAmount).toFixed(7);
        const lockedAmountStr = lockedAmount.toFixed(7);

        // ─── UNIFIED TRANSACTION: Classic Ops + Soroban Op ───
        console.log(`[STELLAR] Building Unified Escrow TX for ${buyerPublicKey}`);
        const builder = new TransactionBuilder(sourceAccount, {
            fee: "1500", // Will be optimized by prepareTransaction
            networkPassphrase: Networks.TESTNET
        });

        // 1. Trustline (Non-Native only)
        if (!isXlm) {
            const horizonAccount = await horizonServer.loadAccount(buyerPublicKey);
            const hasTrustline = (horizonAccount.balances as any[]).some(
                (b: any) => b.asset_code === stellarAsset.code && b.asset_issuer === stellarAsset.issuer
            );
            if (!hasTrustline) {
                console.log(`[STELLAR] Adding ChangeTrust operation for ${stellarAsset.code}`);
                builder.addOperation(Operation.changeTrust({ asset: stellarAsset }));
            }
        }

        // 2. Direct payment to supplier
        if (Number(directAmount) > 0) {
            console.log(`[STELLAR] Adding Direct Payment: ${directAmount} ${asset || 'USDC'}`);
            builder.addOperation(Operation.payment({
                destination: supplierPublicKey,
                asset: stellarAsset,
                amount: directAmount
            }));
        }

        // 3. Escrow payment to vault
        const vaultPublicKey = this.getAdminKeypair().publicKey();
        console.log(`[STELLAR] Adding Vault Payment: ${lockedAmountStr} ${asset || 'USDC'}`);
        builder.addOperation(Operation.payment({
            destination: vaultPublicKey,
            asset: stellarAsset,
            amount: lockedAmountStr
        }));

        // 4. Soroban Contract Call (create_escrow)
        try {
            const simulationOp = contract.call(
                'create_escrow',
                new Address(buyerPublicKey).toScVal(),
                new Address(supplierPublicKey).toScVal(),
                // Native assets in Soroban are always handled as i128 with the same 7-decimal scale as XLM in Classic
                nativeToScVal(BigInt(Math.round(totalAmount * 10000000)), { type: 'i128' }),
                nativeToScVal(BigInt(Math.round(lockedAmount * 10000000)), { type: 'i128' }),
                nativeToScVal(taskId, { type: 'string' }),
                nativeToScVal(BigInt(deadline), { type: 'u64' })
            );

            console.log("[STELLAR] Adding Soroban Contract Call operation");
            builder.addOperation(simulationOp);

            const tx = builder.setTimeout(180).build();
            console.log(`[STELLAR] Simulating Unified TX. Ops: ${tx.operations.length}`);

            const preparedTx = await this.server.prepareTransaction(tx);
            console.log(`[STELLAR] Simulation successful. Fee: ${preparedTx.fee}`);

            const xdr = preparedTx.toEnvelope().toXDR('base64');
            console.log(`[STELLAR] Unified TX built. Buyer: ${buyerPublicKey}, Seq: ${sourceAccount.sequenceNumber()}, XDR length: ${xdr.length}`);

            return { xdr, classicFallback: false };

        } catch (error: any) {
            // Graceful degradation: If Soroban contract call fails (e.g. TTL expired),
            // fallback to returning just the classic payments as a standard TX
            console.warn(`[STELLAR] ⚠️  Soroban escrow simulation failed. Falling back to Classic-only.`);
            console.warn(`[STELLAR]    Error: ${error?.message || error}`);

            // Rebuild without the Soroban Op since the previous builder holds the failed state
            const horizonAccountFallback = await horizonServer.loadAccount(buyerPublicKey);
            const sourceAccountFallback = new Account(buyerPublicKey, horizonAccountFallback.sequence);
            
            const fallbackBuilder = new TransactionBuilder(sourceAccountFallback, {
                fee: "1000",
                networkPassphrase: Networks.TESTNET
            });
            if (!isXlm) {
                const hasTrustline = (horizonAccountFallback.balances as any[]).some((b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER);
                if (!hasTrustline) fallbackBuilder.addOperation(Operation.changeTrust({ asset: stellarAsset }));
            }
            if (Number(directAmount) > 0) {
                fallbackBuilder.addOperation(Operation.payment({ destination: supplierPublicKey, asset: stellarAsset, amount: directAmount }));
            }
            fallbackBuilder.addOperation(Operation.payment({ destination: vaultPublicKey, asset: stellarAsset, amount: lockedAmountStr }));

            const fallbackTx = fallbackBuilder.setTimeout(180).build();
            return { xdr: fallbackTx.toEnvelope().toXDR('base64'), classicFallback: true };
        }
    }

    /**
     * Submit Signed XDR: Moves submission and polling to the background.
     */
    async submitTransaction(signedXdr: string) {
        const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
        const txHash = tx.hash().toString('hex');

        console.log(`[STELLAR] Submitting transaction ${txHash} to Horizon (optimized for sequence sync)...`);
        let result;
        try {
            // Prefer Horizon for submission as it integrates better with our sequence management
            result = await horizonServer.submitTransaction(tx);
        } catch (error: any) {
            const resultName = error.response?.data?.extras?.result_codes?.transaction;
            console.error(`[STELLAR] Horizon Submission Error: ${resultName}`, error.response?.data || error.message);
            
            if (resultName === 'tx_bad_seq') {
                throw new ApiError(400, "Your transaction sequence is out of sync. Please refresh the page and try again.");
            }
            throw new Error(`Transaction failed: ${resultName || error.message}`);
        }

        console.log(`[STELLAR] Transaction confirmed: ${result.hash}`);
        return { hash: result.hash, status: 'SUCCESS' };
    }

    /**
     * Submit Proof: Supplier calls this.
     */
    async buildSubmitProofTx(
        supplierPublicKey: string,
        taskId: string,
        proofCid: string,
        sequence?: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const seq = sequence || (await horizonServer.loadAccount(supplierPublicKey)).sequence;
        const sourceAccount = new Account(supplierPublicKey, seq);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "1000",
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
        return preparedTx.toEnvelope().toXDR('base64');
    }

    /**
     * Vote: Community member calls this.
     */
    async buildVoteTx(
        voterPublicKey: string,
        taskId: string,
        isScam: boolean,
        sequence?: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const seq = sequence || (await horizonServer.loadAccount(voterPublicKey)).sequence;
        const sourceAccount = new Account(voterPublicKey, seq);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "1000",
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
        return preparedTx.toEnvelope().toXDR('base64');
    }

    /**
     * Request Return: Buyer calls this.
     */
    async buildRequestReturnTx(
        buyerPublicKey: string,
        taskId: string,
        sequence?: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const seq = sequence || (await horizonServer.loadAccount(buyerPublicKey)).sequence;
        const sourceAccount = new Account(buyerPublicKey, seq);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'request_return',
                nativeToScVal(taskId, { type: 'string' })
            ))
            .setTimeout(180)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        return preparedTx.toEnvelope().toXDR('base64');
    }

    /**
     * Confirm Return: Supplier calls this.
     */
    async buildConfirmReturnTx(
        supplierPublicKey: string,
        taskId: string,
        sequence?: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const seq = sequence || (await horizonServer.loadAccount(supplierPublicKey)).sequence;
        const sourceAccount = new Account(supplierPublicKey, seq);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'confirm_return',
                nativeToScVal(taskId, { type: 'string' })
            ))
            .setTimeout(180)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        return preparedTx.toEnvelope().toXDR('base64');
    }

    /**
     * Release: Admin/Server calls this after verification.
     */
    async releaseEscrow(taskId: string): Promise<any> {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const adminKeypair = this.getAdminKeypair();
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // 3. Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('release', nativeToScVal(taskId, { type: 'string' }))
        ]);

        tx.sign(adminKeypair);
        try {
            const result = await this.server.sendTransaction(tx);
            if (result.status === 'ERROR' && (result as any).errorResult?.result?._switch?.name === 'txBadSeq') {
                await adminSequenceManager.refresh();
                // Sequence error fixed by refresh; next attempt will use fresh one
                throw new Error("Stellar sequence out of sync. Please retry in a moment.");
            }
            return result;
        } catch (error) {
            console.error('[STELLAR] Release error:', error);
            throw error;
        }
    }

    /**
     * Dispute: Admin/Server calls this if scam detected.
     */
    async disputeEscrow(taskId: string): Promise<any> {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const adminKeypair = this.getAdminKeypair();
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        // 3. Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('dispute', nativeToScVal(taskId, { type: 'string' }))
        ]);

        tx.sign(adminKeypair);
        try {
            const result = await this.server.sendTransaction(tx);
            if (result.status === 'ERROR' && (result as any).errorResult?.result?._switch?.name === 'txBadSeq') {
                await adminSequenceManager.refresh();
                throw new Error("Stellar sequence out of sync. Please retry.");
            }
            return result;
        } catch (error) {
            console.error('[STELLAR] Dispute error:', error);
            throw error;
        }
    }

    /**
     * Partial Release: Admin/Server directly pays half of USDC on dispatch from the Vault
     */
    async releaseDispatchPartialPayment(supplierPublicKey: string, amountUsdc: number) {
        if (!USDC_ISSUER) throw new Error('USDC_ISSUER not configured');

        const adminKeypair = this.getAdminKeypair();
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());

        const usdcAsset = new Asset('USDC', USDC_ISSUER);

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            Operation.payment({
                destination: supplierPublicKey,
                asset: usdcAsset,
                amount: amountUsdc.toFixed(7)
            })
        ]);

        tx.sign(adminKeypair);

        try {
            const result = await this.server.sendTransaction(tx);
            if (result.status === 'ERROR') {
                if ((result as any).errorResult?.result?._switch?.name === 'txBadSeq') {
                    await adminSequenceManager.refresh();
                }
                throw new Error(`Dispatch partial release failed: ${JSON.stringify(result.errorResult || result)}`);
            }
            return result.hash;
        } catch (error) {
            console.error('[STELLAR] Partial release error:', error);
            throw error;
        }
    }

    /**
     * Refund: Admin/Server calls this after dispute lock period expires.
     */
    async refundEscrow(taskId: string): Promise<any> {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const adminKeypair = this.getAdminKeypair();

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('refund', nativeToScVal(taskId, { type: 'string' }))
        ]);

        tx.sign(adminKeypair);

        try {
            const result = await this.server.sendTransaction(tx);
            if (result.status === 'ERROR' && (result as any).errorResult?.result?._switch?.name === 'txBadSeq') {
                await adminSequenceManager.refresh();
                throw new Error("Stellar sequence out of sync. Please retry.");
            }
            return result;
        } catch (error) {
            console.error('[STELLAR] Refund error:', error);
            throw error;
        }
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
     * Get all escrows for an Supplier.
     */
    async getSupplierEscrows(supplierPublicKey: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_ngo_escrows',
                new Address(supplierPublicKey).toScVal()
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
    async getBuyerEscrows(buyerPublicKey: string) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_donor_escrows',
                new Address(buyerPublicKey).toScVal()
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
