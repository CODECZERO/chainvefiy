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
import { server, horizonServer, STACK_ADMIN_SECRET } from './smartContract.handler.stellar.js';

// This will be set after deployment
const ESCROW_CONTRACT_ID = process.env.ESCROW_CONTRACT_ID || '';
const USDC_ISSUER = process.env.USDC_ISSUER || '';

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
        asset?: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        
        // Load accounts
        const horizonAccount = await horizonServer.loadAccount(buyerPublicKey);
        const sourceAccount = await this.server.getAccount(buyerPublicKey);

        if (sourceAccount.sequenceNumber() === "0") {
            throw new Error(`Account ${buyerPublicKey} is not initialized on the Stellar Testnet. Please fund it via Friendbot.`);
        }

        // Assets
        const isXlm = asset === 'XLM';
        if (!isXlm && !USDC_ISSUER) throw new Error('USDC_ISSUER not configured');
        const stellarAsset = isXlm 
            ? Asset.native() 
            : new Asset('USDC', USDC_ISSUER);

        const directAmount = (totalAmount - lockedAmount).toFixed(7);
        const lockedAmountStr = lockedAmount.toFixed(7);

        // ─── UNIFIED TRANSACTION: Classic Ops + Soroban Op ───
        console.log(`[STELLAR] Building Unified Escrow TX for ${buyerPublicKey}`);
        const builder = new TransactionBuilder(sourceAccount, {
            fee: "1500", // Will be optimized by prepareTransaction
            networkPassphrase: Networks.TESTNET
        });

        // 1. Trustline (USDC only)
        if (!isXlm) {
            const hasTrustline = (horizonAccount.balances as any[]).some(
                (b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
            );
            if (!hasTrustline) {
                console.log("[STELLAR] Adding ChangeTrust operation");
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
            console.log(`[STELLAR] Unified TX built. Seq: ${(preparedTx as any).sequence}, XDR length: ${xdr.length}`);
            
            return { xdr, classicFallback: false };
            
        } catch (error: any) {
            // Graceful degradation: If Soroban contract call fails (e.g. TTL expired),
            // fallback to returning just the classic payments as a standard TX
            console.warn(`[STELLAR] ⚠️  Soroban escrow simulation failed. Falling back to Classic-only.`);
            console.warn(`[STELLAR]    Error: ${error?.message || error}`);
            
            // Rebuild without the Soroban Op since the previous builder holds the failed state
            const fallbackBuilder = new TransactionBuilder(sourceAccount, {
                fee: "1000",
                networkPassphrase: Networks.TESTNET
            });
            if (!isXlm) {
                const hasTrustline = (horizonAccount.balances as any[]).some((b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER);
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
        
        console.log(`[STELLAR] Submitting transaction ${txHash} to RPC...`);
        const result = await this.server.sendTransaction(tx);
        
        if (result.status === 'ERROR') {
            console.error(`[STELLAR] RPC Submission Error:`, JSON.stringify(result, null, 2));
            throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult || result)}`);
        }

        // We return immediately with the hash, but the caller (controller) 
        // will wait or we can provide a status check endpoint.
        // For simple backgrounding, we'll await confirmation here but the frontend call will be one-shot.
        
        let status: any = result.status;
        let polls = 0;
        while ((status === 'PENDING' || status === 'NOT_FOUND') && polls < 30) {
            await new Promise(r => setTimeout(r, 1000));
            const txResponse = await this.server.getTransaction(txHash);
            status = txResponse.status;
            polls++;
        }

        if (status !== 'SUCCESS') {
            throw new Error(`Transaction confirmation failed with status: ${status}`);
        }

        console.log(`[STELLAR] Transaction ${txHash} confirmed!`);
        return { hash: txHash, status };
    }

    /**
     * Submit Proof: Supplier calls this.
     */
    async buildSubmitProofTx(
        supplierPublicKey: string,
        taskId: string,
        proofCid: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(supplierPublicKey);

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
        return preparedTx.toEnvelope().toXDR('base64');
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
        return preparedTx.toEnvelope().toXDR('base64');
    }

    /**
     * Request Return: Buyer calls this.
     */
    async buildRequestReturnTx(
        buyerPublicKey: string,
        taskId: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(buyerPublicKey);

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
        taskId: string
    ) {
        if (!ESCROW_CONTRACT_ID) throw new Error('ESCROW_CONTRACT_ID not configured');

        const contract = new Contract(ESCROW_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(supplierPublicKey);

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
     * Partial Release: Admin/Server directly pays half of USDC on dispatch from the Vault
     */
    async releaseDispatchPartialPayment(supplierPublicKey: string, amountUsdc: number) {
        if (!USDC_ISSUER) throw new Error('USDC_ISSUER not configured');
        
        const adminKeypair = this.getAdminKeypair();
        const sourceAccount = await this.server.getAccount(adminKeypair.publicKey());
        
        const usdcAsset = new Asset('USDC', USDC_ISSUER);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(Operation.payment({
                destination: supplierPublicKey,
                asset: usdcAsset,
                amount: amountUsdc.toFixed(7)
            }))
            .setTimeout(180)
            .build();

        const preparedTx = await this.server.prepareTransaction(tx);
        preparedTx.sign(adminKeypair);
        
        try {
            const result = await this.server.sendTransaction(preparedTx);
            if (result.status === 'ERROR') {
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
