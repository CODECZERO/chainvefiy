import { apiClient } from '../../api-client';
import { ApiResponse } from '../../types';

export class MissionRegistryContractService {
    async initialize(adminKey: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/mission-registry/initialize', {
            method: 'POST',
            body: JSON.stringify({ adminKey }),
        }, true);
    }

    async setBadgeContract(adminKey: string, badgeContractAddress: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/mission-registry/set-badge-contract', {
            method: 'POST',
            body: JSON.stringify({ adminKey, badgeContractAddress }),
        }, true);
    }

    async setTokenContract(adminKey: string, tokenContractAddress: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/mission-registry/set-token-contract', {
            method: 'POST',
            body: JSON.stringify({ adminKey, tokenContractAddress }),
        }, true);
    }

    async registerMission(data: {
        captainKey: string;
        missionId: string;
        title: string;
        dangerLevel: number;
        deadline?: number;
    }): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/mission-registry/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }, true);
    }

    async advanceStatus(captainKey: string, missionId: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/mission-registry/advance-status', {
            method: 'POST',
            body: JSON.stringify({ captainKey, missionId }),
        }, true);
    }

    async sealProof(data: {
        validatorKey: string;
        reaperAddress: string;
        missionId: string;
        proofCid: string;
    }): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/mission-registry/seal-proof', {
            method: 'POST',
            body: JSON.stringify(data),
        }, true);
    }

    async failMission(callerKey: string, missionId: string): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/mission-registry/fail', {
            method: 'POST',
            body: JSON.stringify({ callerKey, missionId }),
        }, true);
    }

    async getMission(missionId: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/contracts/mission-registry/mission/${missionId}`, {}, false);
    }

    async getProof(missionId: string): Promise<ApiResponse<any>> {
        return apiClient.request(`/contracts/mission-registry/mission/${missionId}/proof`, {}, false);
    }

    async getCounter(): Promise<ApiResponse<any>> {
        return apiClient.request('/contracts/mission-registry/counter', {}, false);
    }

    async getMissionsByCaptain(captainAddress: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/mission-registry/captain/${captainAddress}`, {}, false);
    }

    async getValidators(missionId: string): Promise<ApiResponse<any[]>> {
        return apiClient.request(`/contracts/mission-registry/mission/${missionId}/validators`, {}, false);
    }
}

export const productRegistryContractService = new MissionRegistryContractService();
