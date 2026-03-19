import { jest } from '@jest/globals';

export const createAccount = jest.fn<() => Promise<{ publicKey: string; secret: string }>>().mockResolvedValue({
    publicKey: 'G_TEST_PUBLIC_KEY',
    secret: 'S_TEST_SECRET_KEY'
});
