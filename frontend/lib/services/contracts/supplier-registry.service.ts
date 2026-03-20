import { apiClient } from '../../api-client';
import { ApiResponse } from '../../types';

export class SupplierRegistryContractService {
    async initialize(adminKey: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/supplier-registry/initialize', {
            method: 'POST',
            body: JSON.stringify({ adminKey }),
        }, true);
    }

    async register(data: {
        ownerKey: string;
        name: string;
        category: number;
        rank: string;
        trustScore: number;
    }): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/supplier-registry/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }, true);
    }

    async updateTrustScore(ownerKey: string, newTrustScore: number): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/supplier-registry/update-trust-score', {
            method: 'POST',
            body: JSON.stringify({ ownerKey, newTrustScore }),
        }, true);
    }

    async promote(adminKey: string, ownerAddress: string, newRank: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/supplier-registry/promote', {
            method: 'POST',
            body: JSON.stringify({ adminKey, ownerAddress, newRank }),
        }, true);
    }

    async suspend(adminKey: string, ownerAddress: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/supplier-registry/suspend', {
            method: 'POST',
            body: JSON.stringify({ adminKey, ownerAddress }),
        }, true);
    }

    async reinstate(adminKey: string, ownerAddress: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/supplier-registry/reinstate', {
            method: 'POST',
            body: JSON.stringify({ adminKey, ownerAddress }),
        }, true);
    }

    async setCategoryCapacity(adminKey: string, category: number, capacity: number): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/supplier-registry/set-category-capacity', {
            method: 'POST',
            body: JSON.stringify({ adminKey, category, capacity }),
        }, true);
    }

    async getSupplier(ownerAddress: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/contracts/supplier-registry/supplier/${ownerAddress}`, {}, false);
    }

    async getByCategory(category: number): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/supplier-registry/category/${category}`, {}, false);
    }

    async getAll(): Promise<ApiResponse<any[]>> {
        return apiClient.request('/contracts/supplier-registry/all', {}, false);
    }

    async getTrustHistory(ownerAddress: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/supplier-registry/trust-history/${ownerAddress}`, {}, false);
    }

    async totalSuppliers(): Promise<ApiResponse<{ total: number }>> {
        return apiClient.request('/contracts/supplier-registry/total', {}, false);
    }
}

export const supplierRegistryContractService = new SupplierRegistryContractService();
