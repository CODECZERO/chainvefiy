import { apiClient } from '../../api-client';
import { ApiResponse } from '../../types';

export class NotificationsContractService {
    async get(id: string): Promise<ApiResponse<Record<string, unknown> | null>> {
        return apiClient.request(`/contracts/notifications/${id}`, {}, false);
    }

    async listByRecipient(recipientPublicKey: string, limit?: number): Promise<ApiResponse<unknown[]>> {
        const q = limit != null ? `?limit=${limit}` : '';
        return apiClient.request(`/contracts/notifications/recipient/${encodeURIComponent(recipientPublicKey)}${q}`, {}, false);
    }

    async count(): Promise<ApiResponse<{ count: number }>> {
        return apiClient.request('/contracts/notifications/count', {}, false);
    }

    async buildSendTx(senderPublicKey: string, recipientPublicKey: string, message: string): Promise<ApiResponse<{ xdr: string }>> {
        return apiClient.request('/contracts/notifications/send/xdr', {
            method: 'POST',
            body: JSON.stringify({ senderPublicKey, recipientPublicKey, message }),
        }, true);
    }
}

export const notificationsContractService = new NotificationsContractService();
