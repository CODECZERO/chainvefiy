import { apiClient } from '../../api-client';
import { ApiResponse } from '../../types';

export class TreasuryContractService {
    async initialize(adminKey: string, multiSigThreshold: string, requiredApprovals: number): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/treasury/initialize', {
            method: 'POST',
            body: JSON.stringify({ adminKey, multiSigThreshold, requiredApprovals }),
        }, true);
    }

    async addSigner(adminKey: string, signerAddress: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/treasury/add-signer', {
            method: 'POST',
            body: JSON.stringify({ adminKey, signerAddress }),
        }, true);
    }

    async deposit(dividerKey: string, amount: string, purpose: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/treasury/deposit', {
            method: 'POST',
            body: JSON.stringify({ dividerKey, amount, purpose }),
        }, true);
    }

    async withdraw(dividerKey: string, amount: string, purpose: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/treasury/withdraw', {
            method: 'POST',
            body: JSON.stringify({ dividerKey, amount, purpose }),
        }, true);
    }

    async approveWithdrawal(signerKey: string, requestId: number): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/treasury/approve-withdrawal', {
            method: 'POST',
            body: JSON.stringify({ signerKey, requestId }),
        }, true);
    }

    async setBudget(adminKey: string, divisionAddress: string, maxAmount: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/treasury/set-budget', {
            method: 'POST',
            body: JSON.stringify({ adminKey, divisionAddress, maxAmount }),
        }, true);
    }

    async getBalance(dividerAddress: string): Promise<ApiResponse<{ balance: string }>> {
        return apiClient.request(`/contracts/treasury/balance/${dividerAddress}`, {}, false);
    }

    async getHistory(dividerAddress: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/treasury/history/${dividerAddress}`, {}, false);
    }

    async getRequest(requestId: number): Promise<ApiResponse<any>> {
        return apiClient.request(`/contracts/treasury/request/${requestId}`, {}, false);
    }

    async getBudget(divisionAddress: string): Promise<ApiResponse<{ budget: string }>> {
        return apiClient.request(`/contracts/treasury/budget/${divisionAddress}`, {}, false);
    }
}

export const treasuryContractService = new TreasuryContractService();
