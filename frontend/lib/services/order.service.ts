import { apiClient } from '../api-client';
import { Order, OrderData, PayWallet, ApiResponse } from '../types';

export class OrderService {
    async getOrders(): Promise<ApiResponse<Order[]>> {
        return apiClient.request('/donations', {}, false);
    }

    async getOrderById(transactionId: string): Promise<ApiResponse<Order>> {
        return apiClient.request(`/donations/${transactionId}`, {}, false);
    }

    async getOrdersByProduct(productId: string): Promise<ApiResponse<Order[]>> {
        return apiClient.request(`/donations/post/${productId}`, {}, false);
    }

    async verifyOrder(orderData: OrderData): Promise<ApiResponse<any>> {
        return apiClient.request('/payment/verify-donation', {
            method: 'POST',
            body: JSON.stringify(orderData),
        }, false);
    }

    async walletPay(payData: PayWallet): Promise<ApiResponse<any>> {
        return apiClient.request('/payment/wallet-pay', {
            method: 'POST',
            body: JSON.stringify(payData),
        }, true);
    }

    async getStats(): Promise<ApiResponse<{ totalRaised: number; activeBuyers: number; verifiedSuppliers: number }>> {
        return apiClient.request('/stats');
    }

    async getLeaderboard(): Promise<ApiResponse<any[]>> {
        return apiClient.request('/stats/leaderboard');
    }

    async getBuyerStats(walletAddr: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/stats/donor/${walletAddr}`);
    }

    async getEscrowXdr(data: {
        buyerPublicKey: string;
        supplierPublicKey: string;
        totalAmount: number;
        lockedAmount: number;
        productId: string;
        deadline: number;
    }): Promise<ApiResponse<{ xdr: string; escrowId: string }>> {
        return apiClient.request('/donations/escrow/xdr', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

export const orderService = new OrderService();

/** @deprecated Use orderService instead */
export const donationService = orderService;
