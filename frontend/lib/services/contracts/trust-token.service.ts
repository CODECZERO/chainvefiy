import { apiClient } from '../../api-client';
import { ApiResponse } from '../../types';

export class TrustTokenContractService {
    async initialize(adminKey: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/initialize', {
            method: 'POST',
            body: JSON.stringify({ adminKey }),
        }, true);
    }

    async addMinter(adminKey: string, minterAddress: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/add-minter', {
            method: 'POST',
            body: JSON.stringify({ adminKey, minterAddress }),
        }, true);
    }

    async removeMinter(adminKey: string, minterAddress: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/remove-minter', {
            method: 'POST',
            body: JSON.stringify({ adminKey, minterAddress }),
        }, true);
    }

    async mint(minterKey: string, toAddress: string, amount: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/mint', {
            method: 'POST',
            body: JSON.stringify({ minterKey, toAddress, amount }),
        }, true);
    }

    async burn(ownerKey: string, amount: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/burn', {
            method: 'POST',
            body: JSON.stringify({ ownerKey, amount }),
        }, true);
    }

    async transfer(fromKey: string, toAddress: string, amount: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/transfer', {
            method: 'POST',
            body: JSON.stringify({ fromKey, toAddress, amount }),
        }, true);
    }

    async approve(ownerKey: string, spenderAddress: string, amount: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/approve', {
            method: 'POST',
            body: JSON.stringify({ ownerKey, spenderAddress, amount }),
        }, true);
    }

    async transferFrom(data: {
        spenderKey: string;
        fromAddress: string;
        toAddress: string;
        amount: string;
    }): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/transfer-from', {
            method: 'POST',
            body: JSON.stringify(data),
        }, true);
    }

    async stake(userKey: string, amount: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/stake', {
            method: 'POST',
            body: JSON.stringify({ userKey, amount }),
        }, true);
    }

    async unstake(userKey: string, amount: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/unstake', {
            method: 'POST',
            body: JSON.stringify({ userKey, amount }),
        }, true);
    }

    async claimRewards(userKey: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/claim-rewards', {
            method: 'POST',
            body: JSON.stringify({ userKey }),
        }, true);
    }

    async lock(adminKey: string, targetAddress: string, amount: string, unlockAt: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/lock', {
            method: 'POST',
            body: JSON.stringify({ adminKey, targetAddress, amount, unlockAt }),
        }, true);
    }

    async unlock(userKey: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/trust-token/unlock', {
            method: 'POST',
            body: JSON.stringify({ userKey }),
        }, true);
    }

    async balance(address: string): Promise<ApiResponse<{ balance: string }>> {
        return apiClient.request(`/contracts/trust-token/balance/${address}`, {}, false);
    }

    async staked(address: string): Promise<ApiResponse<{ staked: string }>> {
        return apiClient.request(`/contracts/trust-token/staked/${address}`, {}, false);
    }

    async totalSupply(): Promise<ApiResponse<{ totalSupply: string }>> {
        return apiClient.request('/contracts/trust-token/total-supply', {}, false);
    }

    async locked(address: string): Promise<ApiResponse<{ locked: string }>> {
        return apiClient.request(`/contracts/trust-token/locked/${address}`, {}, false);
    }

    async pendingRewards(address: string): Promise<ApiResponse<{ pendingRewards: string }>> {
        return apiClient.request(`/contracts/trust-token/pending-rewards/${address}`, {}, false);
    }

    async allowance(ownerAddress: string, spenderAddress: string): Promise<ApiResponse<{ allowance: string }>> {
        return apiClient.request(`/contracts/trust-token/allowance/${ownerAddress}/${spenderAddress}`, {}, false);
    }
}

export const trustTokenContractService = new TrustTokenContractService();
