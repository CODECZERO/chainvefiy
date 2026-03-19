import { jest } from '@jest/globals';

export const registerMission = jest.fn<() => Promise<{ hash: string }>>().mockResolvedValue({ hash: 'MOCK_TX_HASH' });
export const sealMissionProof = jest.fn();
export const saveContractWithWallet = jest.fn();
export const getLatestData = jest.fn();
export const server = {}; // Mock server object if imported
