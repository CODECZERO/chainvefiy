import { apiClient } from '../api-client';
import { ApiResponse } from '../types';

export class IpfsService {
    async uploadToIPFS(file: File): Promise<ApiResponse<any>> {
        const formData = new FormData();
        formData.append('file', file);

        return apiClient.request('/ipfs/upload', {
            method: 'POST',
            body: formData,
        });
    }
}

export const ipfsService = new IpfsService();
