import { apiClient } from '../../api-client';
import { ApiResponse } from '../../types';

export class EscrowContractService {
    async buildCreateEscrowTx(data: {
        donorPublicKey: string;
        ngoPublicKey: string;
        totalAmount: number;
        lockedAmount: number;
        taskId: string;
        deadline?: number;
    }): Promise<ApiResponse<{ xdr: string }>> {
        return apiClient.request('/contracts/escrow/create-escrow/xdr', {
            method: 'POST',
            body: JSON.stringify(data),
        }, true);
    }

    async buildSubmitProofTx(data: {
        ngoPublicKey: string;
        taskId: string;
        proofCid: string;
    }): Promise<ApiResponse<{ xdr: string }>> {
        return apiClient.request('/contracts/escrow/submit-proof/xdr', {
            method: 'POST',
            body: JSON.stringify(data),
        }, true);
    }

    async buildVoteTx(data: {
        voterPublicKey: string;
        taskId: string;
        isScam: boolean;
    }): Promise<ApiResponse<{ xdr: string }>> {
        return apiClient.request('/contracts/escrow/vote/xdr', {
            method: 'POST',
            body: JSON.stringify(data),
        }, true);
    }

    async releaseEscrow(taskId: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/escrow/release', {
            method: 'POST',
            body: JSON.stringify({ taskId }),
        }, true);
    }

    async disputeEscrow(taskId: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/escrow/dispute', {
            method: 'POST',
            body: JSON.stringify({ taskId }),
        }, true);
    }

    async refundEscrow(taskId: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/escrow/refund', {
            method: 'POST',
            body: JSON.stringify({ taskId }),
        }, true);
    }

    async getEscrow(taskId: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/contracts/escrow/${taskId}`, {}, false);
    }

    async getNgoEscrows(ngoPublicKey: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/escrow/ngo/${ngoPublicKey}`, {}, false);
    }

    async getDonorEscrows(donorPublicKey: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/escrow/donor/${donorPublicKey}`, {}, false);
    }

    async getVotes(taskId: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/escrow/${taskId}/votes`, {}, false);
    }

    async getVoterStats(voterPublicKey: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/contracts/escrow/voter/${voterPublicKey}/stats`, {}, false);
    }

    async getPlatformStats(): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/escrow/stats/platform', {}, false);
    }
}

export const escrowContractService = new EscrowContractService();
