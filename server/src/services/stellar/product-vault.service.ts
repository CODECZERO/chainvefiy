import {
    Contract,
    xdr,
    Address,
    nativeToScVal,
    scValToNative,
    Keypair,
    TransactionBuilder,
    Networks
} from '@stellar/stellar-sdk';
import { server, horizonServer, STACK_ADMIN_SECRET, adminSequenceManager } from './smartContract.handler.stellar.js';
import { compressData, decompressData } from '../../utils/compression.utils.js';
import logger from '../../util/logger.js';
import { logCompression, logDecompression } from '../../util/compressionLogger.js';

// This will be set after deployment
const VAULT_CONTRACT_ID = process.env.VAULT_CONTRACT_ID || '';

// Known invalid/placeholder ID to check against
const INVALID_CONTRACT_ID = 'CC76VNFKSTN5KOR7LHTCDI4QW44V5F5B5N5E5P5S5W5S5X5C5H5U5P5U';

interface CacheEntry {
    data: any;
    timestamp: number;
}

export class ProductVaultService {
    private server = server;
    private adminKeypair = Keypair.fromSecret(STACK_ADMIN_SECRET);
    private cache: Map<string, CacheEntry> = new Map();
    private readonly CACHE_TTL = 30000; // 30 seconds

    private isContractValid(): boolean {
        if (!VAULT_CONTRACT_ID) return false;
        if (VAULT_CONTRACT_ID === INVALID_CONTRACT_ID) return false;
        // Basic StrKey validation (approximate)
        if (VAULT_CONTRACT_ID.length !== 56 || !VAULT_CONTRACT_ID.startsWith('C')) return false;
        return true;
    }

    /**
     * Stores any data object on-chain in a specific collection.
     */
    async put(collection: string, id: string, data: any, skipIndex: boolean = false) {
        if (!this.isContractValid()) {
            logger.warn(`[VAULT] Skipping on-chain storage: Invalid or missing Contract ID (${VAULT_CONTRACT_ID})`);
            return; // Fail silently/gracefully during development to allow DB updates to proceed
        }

        const compressResult = await compressData(data);
        const compressed = compressResult.buffer;

        const ratio = compressResult.originalSize / compressResult.compressedSize;
        const savedBytes = compressResult.originalSize - compressResult.compressedSize;
        const savedPercent = ((savedBytes / compressResult.originalSize) * 100).toFixed(1);

        logger.info(`[VAULT] Compressing ${collection}:${id}. Original: ${compressResult.originalSize}B → Compressed: ${compressResult.compressedSize}B (${ratio.toFixed(1)}x)`);
        logCompression({
            collection,
            id,
            originalBytes: compressResult.originalSize,
            compressedBytes: compressResult.compressedSize,
            ratio: `${ratio.toFixed(1)}x`,
            savedBytes,
            savedPercent: `${savedPercent}%`,
        });

        const contract = new Contract(VAULT_CONTRACT_ID);
        
        try {
            // Build and sign transaction with globally synchronized helper
            const tx = await adminSequenceManager.buildTransaction([
                contract.call('put',
                    nativeToScVal(collection, { type: 'string' }),
                    nativeToScVal(id, { type: 'string' }),
                    nativeToScVal(compressed)
                )
            ]);

            tx.sign(this.adminKeypair);
            const result = await horizonServer.submitTransaction(tx);

            if (result.status === 'ERROR' && (result as any).errorResult?.result?._switch?.name === 'txBadSeq') {
                await adminSequenceManager.refresh();
                throw new Error("Stellar sequence out of sync. Please retry.");
            }

            logger.info(`[VAULT] Transaction sent: ${result.hash} (status: ${result.status})`);

            // 3. Update Index (Secondary on-chain record for fast retrieval)
            if (!skipIndex && collection !== 'System') {
                await this.updateIndex(collection, id);
            }

            // 4. Invalidate relevant cache
            const cacheKey = `${collection}:${id}`;
            this.cache.delete(cacheKey);
            if (collection.endsWith('_Index')) {
                this.cache.delete(cacheKey);
            } else if (collection !== 'System') {
                const indexCacheKey = `System:Index_${collection}`;
                this.cache.delete(indexCacheKey);
            }

            return result;

        } catch (error: any) {
            logger.error(`[VAULT] Failed to put data: ${error}`);
            throw error;
        }
    }

    /**
     * Stores a record with a secondary index (e.g., Email lookup).
     */
    async putWithIndex(collection: string, id: string, data: any, indexField: string, indexValue: string) {
        await this.put(collection, id, data);
        await this.put(`${collection}_${indexField}_Index`, indexValue, id);
    }

    /**
     * Retrieves a record ID using a secondary index.
     */
    async getByIndex(collection: string, indexField: string, indexValue: string): Promise<any | null> {
        const id = await this.get(`${collection}_${indexField}_Index`, indexValue);
        if (!id) return null;
        return await this.get(collection, id);
    }

    /**
     * Updates the systemic collection index on-chain.
     */
    private async updateIndex(collection: string, id: string) {
        const indexKey = `Index_${collection}`;
        const existingIndex: string[] = await this.get('System', indexKey) || [];
        if (!existingIndex.includes(id)) {
            existingIndex.push(id);
            // Use skipIndex to prevent infinite loop
            await this.put('System', indexKey, existingIndex, true);
        }
    }

    /**
     * Appends an ID to a set on-chain (e.g. all donation IDs for a donor).
     */
    async putToSet(collection: string, setKey: string, id: string) {
        const existing: string[] = await this.get(collection, setKey) || [];
        if (!existing.includes(id)) {
            existing.push(id);
            await this.put(collection, setKey, existing);
        }
    }

    /**
     * Retrieves all records for a collection.
     */
    async getAll(collection: string): Promise<any[]> {
        const indexKey = `Index_${collection}`;
        const ids: string[] = (await this.get('System', indexKey)) || [];
        return await this.getMany(collection, ids);
    }

    /**
     * Retrieves all items for a given list of IDs with concurrency limiting.
     */
    async getMany(collection: string, ids: string[]): Promise<any[]> {
        const results: any[] = [];
        const CONCURRENCY_LIMIT = 3; // Conservative to avoid RPC stalls or event loop saturation

        for (let i = 0; i < ids.length; i += CONCURRENCY_LIMIT) {
            const chunk = ids.slice(i, i + CONCURRENCY_LIMIT);
            const chunkResults = await Promise.all(chunk.map(id => this.get(collection, id)));
            results.push(...chunkResults.filter(r => r !== null));
        }

        return results;
    }

    /**
     * Retrieves and decompresses data from the vault.
     */
    async get(collection: string, id: string): Promise<any | null> {
        if (!this.isContractValid()) {
            // Suppress warning on every get to avoid log spam, but return null
            return null;
        }

        const cacheKey = `${collection}:${id}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            // logger.debug(`[VAULT] Cache hit for ${cacheKey}`);
            return cached.data;
        }

        const contract = new Contract(VAULT_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        // Use simulateTransaction for retrieval
        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('get',
                nativeToScVal(collection, { type: 'string' }),
                nativeToScVal(id, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const simulation = await this.server.simulateTransaction(tx);

        // Debug Simulation
        // logger.debug(`[VAULT] Simulation result for ${collection}:${id}:`, JSON.stringify(simulation));

        // Extract result from simulation
        const simAny = simulation as any;
        if (simAny.error) {
            throw new Error(`[VAULT] Simulation failed for ${collection}:${id}: ${JSON.stringify(simAny.error)}`);
        }

        let scVal;
        // @ts-ignore
        const resultXdr = (simulation as any).results?.[0]?.xdr;

        if (resultXdr) {
            scVal = xdr.ScVal.fromXDR(resultXdr, 'base64');
        } else if ((simulation as any).result?.retval) {
            scVal = (simulation as any).result.retval;
        } else {
            // Return null is expected for "not found", but for debugging we want to know IF it was looked up.
            // throw new Error(`[VAULT] No result XDR for ${collection}:${id} (Data not found?)`);
            return null;
        }

        const native = scValToNative(scVal);

        if (!native || !Buffer.isBuffer(native) || native.length === 0) {
            // console.warn(`[VAULT] Retrieved value for ${collection}:${id} is not a valid/empty Buffer:`, native);
            return null;
        }

        try {
            const decompressResult = await decompressData(native as Buffer);
            const decompRatio = decompressResult.decompressedSize / decompressResult.compressedSize;

            logDecompression({
                collection,
                id,
                compressedBytes: decompressResult.compressedSize,
                decompressedBytes: decompressResult.decompressedSize,
                ratio: `${decompRatio.toFixed(1)}x`,
            });

            // Cache the result
            const result = decompressResult.data;
            this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

            return result;
        } catch (e) {
            logger.error(`[VAULT] Decompression failed for ${collection}:${id}:`, e);
            throw new Error(`[VAULT] Decompression failed for ${collection}:${id}: ${e}`);
        }
    }

    /**
     * Get chunk metadata without retrieving data.
     */
    async getMeta(collection: string, id: string) {
        if (!this.isContractValid()) {
            return null;
        }

        const contract = new Contract(VAULT_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_meta',
                nativeToScVal(collection, { type: 'string' }),
                nativeToScVal(id, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const simulation = await this.server.simulateTransaction(tx);
        const simAny = simulation as any;

        if (simAny.error) {
            return null;
        }

        const resultXdr = simAny.results?.[0]?.xdr;
        if (resultXdr) {
            const scVal = xdr.ScVal.fromXDR(resultXdr, 'base64');
            return scValToNative(scVal);
        }
        return null;
    }

    /**
     * Get all delta patches for an entry.
     */
    async getDeltas(collection: string, id: string) {
        if (!this.isContractValid()) {
            return [];
        }

        const contract = new Contract(VAULT_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_deltas',
                nativeToScVal(collection, { type: 'string' }),
                nativeToScVal(id, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const simulation = await this.server.simulateTransaction(tx);
        const simAny = simulation as any;

        if (simAny.error) {
            return [];
        }

        const resultXdr = simAny.results?.[0]?.xdr;
        if (resultXdr) {
            const scVal = xdr.ScVal.fromXDR(resultXdr, 'base64');
            return scValToNative(scVal);
        }
        return [];
    }

    /**
     * Check existence using Bloom filter (fast O(1) negative lookup).
     */
    async bloomCheck(collection: string, id: string): Promise<boolean> {
        if (!this.isContractValid()) {
            return false;
        }

        const contract = new Contract(VAULT_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'bloom_check',
                nativeToScVal(collection, { type: 'string' }),
                nativeToScVal(id, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const simulation = await this.server.simulateTransaction(tx);
        const simAny = simulation as any;

        if (simAny.error) {
            return false;
        }

        const resultXdr = simAny.results?.[0]?.xdr;
        if (resultXdr) {
            const scVal = xdr.ScVal.fromXDR(resultXdr, 'base64');
            return scValToNative(scVal) as boolean;
        }
        return false;
    }

    /**
     * Definitive existence check (reads storage).
     */
    async has(collection: string, id: string): Promise<boolean> {
        if (!this.isContractValid()) {
            return false;
        }

        const contract = new Contract(VAULT_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'has',
                nativeToScVal(collection, { type: 'string' }),
                nativeToScVal(id, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const simulation = await this.server.simulateTransaction(tx);
        const simAny = simulation as any;

        if (simAny.error) {
            return false;
        }

        const resultXdr = simAny.results?.[0]?.xdr;
        if (resultXdr) {
            const scVal = xdr.ScVal.fromXDR(resultXdr, 'base64');
            return scValToNative(scVal) as boolean;
        }
        return false;
    }

    /**
     * Get the full index for a collection.
     */
    async getIndex(collection: string) {
        if (!this.isContractValid()) {
            return [];
        }

        const contract = new Contract(VAULT_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call(
                'get_index',
                nativeToScVal(collection, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const simulation = await this.server.simulateTransaction(tx);
        const simAny = simulation as any;

        if (simAny.error) {
            return [];
        }

        const resultXdr = simAny.results?.[0]?.xdr;
        if (resultXdr) {
            const scVal = xdr.ScVal.fromXDR(resultXdr, 'base64');
            return scValToNative(scVal);
        }
        return [];
    }

    /**
     * Get storage utilization statistics.
     */
    async getStats() {
        if (!this.isContractValid()) {
            return {
                total_entries: 0,
                hot_entries: 0,
                cold_entries: 0,
                total_bytes_stored: 0,
                total_bytes_original: 0,
                compression_ratio: 0,
                bloom_false_positive_rate: 8
            };
        }

        const contract = new Contract(VAULT_CONTRACT_ID);
        const sourceAccount = await this.server.getAccount(this.adminKeypair.publicKey());

        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contract.call('get_stats'))
            .setTimeout(30)
            .build();

        const simulation = await this.server.simulateTransaction(tx);
        const simAny = simulation as any;

        if (simAny.error) {
            return {
                total_entries: 0,
                hot_entries: 0,
                cold_entries: 0,
                total_bytes_stored: 0,
                total_bytes_original: 0,
                compression_ratio: 0,
                bloom_false_positive_rate: 8
            };
        }

        const resultXdr = simAny.results?.[0]?.xdr;
        if (resultXdr) {
            const scVal = xdr.ScVal.fromXDR(resultXdr, 'base64');
            return scValToNative(scVal);
        }
        return {
            total_entries: 0,
            hot_entries: 0,
            cold_entries: 0,
            total_bytes_stored: 0,
            total_bytes_original: 0,
            compression_ratio: 0,
            bloom_false_positive_rate: 8
        };
    }

    /**
     * Migrate an entry from Hot → Cold zone.
     */
    async migrateToCold(collection: string, id: string) {
        if (!this.isContractValid()) {
            logger.warn(`[VAULT] Skipping migration: Invalid or missing Contract ID`);
            return;
        }

        const contract = new Contract(VAULT_CONTRACT_ID);

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('migrate_to_cold',
                nativeToScVal(collection, { type: 'string' }),
                nativeToScVal(id, { type: 'string' })
            )
        ]);

        tx.sign(this.adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        logger.info(`[VAULT] Migrated ${collection}:${id} to cold storage - ${result.hash}`);
        return result;
    }

    /**
     * Delete an entry.
     */
    async delete(collection: string, id: string) {
        if (!this.isContractValid()) {
            logger.warn(`[VAULT] Skipping deletion: Invalid or missing Contract ID`);
            return;
        }

        const contract = new Contract(VAULT_CONTRACT_ID);

        // Build and sign transaction with globally synchronized helper
        const tx = await adminSequenceManager.buildTransaction([
            contract.call('delete',
                nativeToScVal(collection, { type: 'string' }),
                nativeToScVal(id, { type: 'string' })
            )
        ]);

        tx.sign(this.adminKeypair);
        const result = await horizonServer.submitTransaction(tx);

        // Invalidate cache
        this.cache.delete(`${collection}:${id}`);
        this.cache.delete(`System:Index_${collection}`);

        logger.info(`[VAULT] Deleted ${collection}:${id} - ${result.hash}`);
        return result;
    }
}

export const productVault = new ProductVaultService();
