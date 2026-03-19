import { apiClient } from '../api-client';
import { LoginData, SignupData, ApiResponse } from '../types';

export class AuthService {
    async login(loginData: LoginData): Promise<ApiResponse<any>> {
        return apiClient.request('/user/login', {
            method: 'POST',
            body: JSON.stringify(loginData),
        });
    }

    async signup(signupData: SignupData): Promise<ApiResponse<any>> {
        return apiClient.request('/user/signup', {
            method: 'POST',
            body: JSON.stringify(signupData),
        });
    }

    logout() {
        apiClient.clearAuth();
    }

    isAuthenticated(): boolean {
        return apiClient.isAuthenticated();
    }

    // Test authentication status
    async testAuth(): Promise<ApiResponse<any>> {
        return apiClient.request('/posts');
    }
}

export const authService = new AuthService();
