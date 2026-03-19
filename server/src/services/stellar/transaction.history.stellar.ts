import { Horizon } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import logger from '../../util/logger.js';
dotenv.config();

const HORIZON_URL = process.env.BLOCKCHAIN_NETWORK || 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);

export interface TransactionRecord {
    id: string;
    hash: string;
    ledger: number;
    created_at: string;
    source_account: string;
    fee_charged: string;
    operation_count: number;
    memo_type: string;
    memo?: string;
    successful: boolean;
}

/**
 * Fetch transaction history for a Stellar public key.
 * Returns the most recent transactions (up to `limit`).
 */
export async function getTransactionHistory(
    publicKey: string,
    limit: number = 20,
    order: 'asc' | 'desc' = 'desc'
): Promise<TransactionRecord[]> {
    try {
        const txPage = await server
            .transactions()
            .forAccount(publicKey)
            .limit(limit)
            .order(order)
            .call();

        return txPage.records.map((tx: any) => ({
            id: tx.id,
            hash: tx.hash,
            ledger: tx.ledger_attr,
            created_at: tx.created_at,
            source_account: tx.source_account,
            fee_charged: tx.fee_charged,
            operation_count: tx.operation_count,
            memo_type: tx.memo_type,
            memo: tx.memo || undefined,
            successful: tx.successful,
        }));
    } catch (error: any) {
        if (error?.response?.status === 404) {
            return []; // Account not found or has no transactions
        }
        if (error?.response?.status === 400) {
            logger.warn('Horizon bad request for transaction history', { detail: error?.response?.detail, extras: error?.response?.extras });
            return []; // Invalid request, return empty rather than 500
        }
        logger.error('Error fetching transaction history', { message: error?.message });
        throw error;
    }
}

/**
 * Fetch operation details for a specific transaction.
 */
export async function getTransactionOperations(txHash: string): Promise<any[]> {
    try {
        const ops = await server
            .operations()
            .forTransaction(txHash)
            .call();

        return ops.records.map((op: any) => ({
            id: op.id,
            type: op.type,
            source_account: op.source_account,
            created_at: op.created_at,
            ...op,
        }));
    } catch (error: any) {
        logger.error('Error fetching transaction operations', { message: error?.message });
        throw error;
    }
}
