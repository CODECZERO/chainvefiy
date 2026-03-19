import { apiClient } from '../api-client';
import { Supplier, ApiResponse } from '../types';

export class UserService {
    async findUser(email?: string, id?: string): Promise<ApiResponse<Supplier[]>> {
        const params = new URLSearchParams();
        if (email) params.append('email', email);
        if (id) params.append('id', id);
        return apiClient.request(`/user-management/find?${params.toString()}`);
    }

    async getUserPrivateKey(userId: string): Promise<ApiResponse<{ privateKey: string }>> {
        return apiClient.request(`/user-management/private-key/${userId}`);
    }

    async getUserProfile(walletAddr: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/user-profile/${walletAddr}`);
    }
}

export const userService = new UserService();
