import { apiClient } from '../../api-client';
import { ApiResponse } from '../../types';

export class SellerBadgeContractService {
    async initialize(adminKey: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/seller-badge/initialize', {
            method: 'POST',
            body: JSON.stringify({ adminKey }),
        }, true);
    }

    async mint(sellerAddress: string, productId: string, rank: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/seller-badge/mint', {
            method: 'POST',
            body: JSON.stringify({ sellerAddress, productId, rank }),
        }, true);
    }

    async revoke(adminKey: string, sellerAddress: string, productId: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/seller-badge/revoke', {
            method: 'POST',
            body: JSON.stringify({ adminKey, sellerAddress, productId }),
        }, true);
    }

    async getBadges(sellerAddress: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/seller-badge/seller/${sellerAddress}`, {}, false);
    }

    async verifyBadge(sellerAddress: string, productId: string): Promise<ApiResponse<{ verified: boolean }>> {
        return apiClient.request(`/contracts/seller-badge/verify/${sellerAddress}/${productId}`, {}, false);
    }

    async badgeCount(sellerAddress: string): Promise<ApiResponse<{ count: number }>> {
        return apiClient.request(`/contracts/seller-badge/count/${sellerAddress}`, {}, false);
    }

    async totalBadges(): Promise<ApiResponse<{ total: number }>> {
        return apiClient.request('/contracts/seller-badge/total', {}, false);
    }

    async getTopSellers(limit: number = 10): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/seller-badge/leaderboard?limit=${limit}`, {}, false);
    }
}

export const sellerBadgeContractService = new SellerBadgeContractService();
