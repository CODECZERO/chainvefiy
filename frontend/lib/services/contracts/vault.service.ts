import { apiClient } from '../../api-client';
import { ApiResponse } from '../../types';

export class VaultContractService {
    async put(collection: string, id: string, data: any): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/vault/put', {
            method: 'POST',
            body: JSON.stringify({ collection, id, data }),
        }, true);
    }

    async get(collection: string, id: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/contracts/vault/${collection}/${id}`, {}, false);
    }

    async getMeta(collection: string, id: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/contracts/vault/${collection}/${id}/meta`, {}, false);
    }

    async getDeltas(collection: string, id: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/vault/${collection}/${id}/deltas`, {}, false);
    }

    async bloomCheck(collection: string, id: string): Promise<ApiResponse<{ exists: boolean }>> {
        return apiClient.request(`/contracts/vault/${collection}/${id}/bloom-check`, {}, false);
    }

    async has(collection: string, id: string): Promise<ApiResponse<{ exists: boolean }>> {
        return apiClient.request(`/contracts/vault/${collection}/${id}/has`, {}, false);
    }

    async getIndex(collection: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/vault/${collection}/index`, {}, false);
    }

    async getStats(): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/vault/stats', {}, false);
    }

    async migrateToCold(collection: string, id: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/vault/migrate-to-cold', {
            method: 'POST',
            body: JSON.stringify({ collection, id }),
        }, true);
    }

    async delete(collection: string, id: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/vault/delete', {
            method: 'DELETE',
            body: JSON.stringify({ collection, id }),
        }, true);
    }
}

export const vaultContractService = new VaultContractService();
