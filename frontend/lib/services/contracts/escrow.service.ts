import { apiClient } from '../../api-client';
import { ApiResponse } from '../../types';

export class EscrowContractService {
    async buildCreateEscrowTx(data: {
        buyerPublicKey: string;
        supplierPublicKey: string;
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
        supplierPublicKey: string;
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

    async buildRequestReturnTx(data: {
        buyerPublicKey: string;
        taskId: string;
    }): Promise<ApiResponse<{ xdr: string }>> {
        return apiClient.request('/contracts/escrow/request-return/xdr', {
            method: 'POST',
            body: JSON.stringify(data),
        }, true);
    }

    async buildConfirmReturnTx(data: {
        supplierPublicKey: string;
        taskId: string;
    }): Promise<ApiResponse<{ xdr: string }>> {
        return apiClient.request('/contracts/escrow/confirm-return/xdr', {
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

    async getSupplierEscrows(supplierPublicKey: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/escrow/supplier/${supplierPublicKey}`, {}, false);
    }

    async getBuyerEscrows(buyerPublicKey: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/escrow/buyer/${buyerPublicKey}`, {}, false);
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
