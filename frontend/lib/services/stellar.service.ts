import { apiClient } from '../api-client';
import { ApiResponse } from '../types';

export class StellarService {
    async getWalletBalance(publicKey: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/stellar/balance/${publicKey}`, {}, false);
    }

    async sendPayment(paymentData: {
        senderKey: string;
        receiverKey: string;
        amount: number;
        meta: {
            cid: string;
            prevTxn?: string;
        };
    }): Promise<ApiResponse<any>> {
        return apiClient.request('/stellar/send-payment', {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
    }

    async verifyTransaction(transactionId: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/stellar/verify/${transactionId}`);
    }

    async createStellarAccount(): Promise<ApiResponse<any>> {
        return apiClient.request('/stellar/create-account', {
            method: 'POST',
        });
    }

    async saveToSmartContract(contractData: {
        privateKey: string;
        reciverKey: string;
        amount: number;
        cid: string;
        prevTxn: string;
        metadata?: string;
        contractId?: string;
    }): Promise<ApiResponse<any>> {
        return apiClient.request('/stellar/smart-contract', {
            method: 'POST',
            body: JSON.stringify(contractData),
        });
    }

    async getLatestContractData(privateKey: string, contractId?: string): Promise<ApiResponse<any>> {
        return apiClient.request('/stellar/get-latest-data', {
            method: 'POST',
            body: JSON.stringify({ privateKey, contractId }),
        });
    }

    async deleteStellarAccount(secret: string, destination: string): Promise<ApiResponse<any>> {
        return apiClient.request('/stellar/delete-account', {
            method: 'DELETE',
            body: JSON.stringify({ secret, destination }),
        });
    }

    // Community & Proofs xdr generation
    async getSubmitProofXdr(data: {
        supplierPublicKey: string;
        taskId: string;
        proofCid: string;
    }): Promise<ApiResponse<{ xdr: string }>> {
        return apiClient.request('/community/submit-proof/xdr', {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async getVoteXdr(data: {
        taskId: string;
        voterWallet: string;
        isScam: boolean;
    }): Promise<ApiResponse<{ xdr: string }>> {
        return apiClient.request('/community/vote/xdr', {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    // Submission
    async submitProof(taskId: string, data: {
        submitter: string;
        cid: string;
        amount: number;
        description: string;
        transactionHash: string;
        supplierId: string;
    }): Promise<ApiResponse<any>> {
        return apiClient.request(`/community/submit-proof`, {
            method: "POST",
            body: JSON.stringify({
                taskId,
                supplierId: data.supplierId,
                proofCid: data.cid,
                description: data.description,
                submitterWallet: data.submitter,
                transactionHash: data.transactionHash
            }),
        });
    }

    async getProofsByTask(taskId: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/community/proofs/task/${taskId}`);
    }

    async voteOnProof(proofId: string, data: {
        voter: string;
        isScam: boolean;
        taskId: string;
    }): Promise<ApiResponse<any>> {
        return apiClient.request(`/community/proof/${proofId}/vote`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async verifyProof(hash: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/community/proof/verify/${hash}`);
    }

    async voteOnTask(data: {
        taskId: string;
        voterWallet: string;
        isScam: boolean;
        reason?: string;
    }): Promise<ApiResponse<any>> {
        return apiClient.request('/community/vote', {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async getVotesForTask(taskId: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/community/votes/${taskId}`);
    }
}

export const stellarService = new StellarService();
