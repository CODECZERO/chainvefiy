// @ts-nocheck
import request from 'supertest';
import { jest } from '@jest/globals';
import { Buffer } from 'buffer';

// Mock Stellar SDK
jest.unstable_mockModule('@stellar/stellar-sdk', () => ({
  Contract: jest.fn().mockImplementation(() => ({
    call: jest.fn().mockReturnValue({}),
  })),
  Address: jest.fn().mockImplementation(() => ({
    toScVal: jest.fn().mockReturnValue({}),
  })),
  Keypair: {
    fromSecret: jest.fn().mockImplementation(() => ({
      publicKey: () => 'G_MOCK_ADMIN',
      secret: () => 'S_MOCK_ADMIN',
    })),
    fromPublicKey: jest.fn().mockImplementation(() => ({})),
    random: jest.fn().mockImplementation(() => ({
        secret: () => 'S_MOCK_EPHEMERAL',
        publicKey: () => 'G_MOCK_EPHEMERAL'
    }))
  },
  TransactionBuilder: jest.fn().mockImplementation(() => ({
    addOperation: jest.fn().mockReturnThis(),
    addMemo: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
        sign: jest.fn(),
        toXDR: jest.fn().mockReturnValue('MOCK_XDR'),
        hash: () => Buffer.from('MOCK_TX_HASH').toString('hex'),
    }),
    fromXDR: jest.fn().mockImplementation(() => ({
        hash: () => Buffer.from('MOCK_TX_HASH').toString('hex'),
    })),
  })),
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  Account: jest.fn().mockImplementation(() => ({})),
  Asset: { native: jest.fn().mockReturnValue({ code: 'XLM' }) },
  Operation: {
      payment: jest.fn().mockReturnValue({}),
      changeTrust: jest.fn().mockReturnValue({}),
  },
  rpc: {
      Server: jest.fn().mockImplementation(() => ({})),
  },
  Horizon: {
      Server: jest.fn().mockImplementation(() => ({})),
  },
  xdr: {
      ScVal: { fromXDR: jest.fn() },
      ScValType: { scvVoid: () => ({ name: 'scvVoid' }), scvMap: () => ({ name: 'scvMap' }) }
  },
  nativeToScVal: jest.fn().mockReturnValue({}),
  scValToNative: jest.fn().mockReturnValue({}),
  BASE_FEE: '100',
  Memo: {
    text: jest.fn().mockImplementation((text) => ({ _text: text, type: 'text' })),
    id: jest.fn(),
    hash: jest.fn(),
    none: jest.fn(),
  },
}));

const prismaMock = {
    user: { findUnique: jest.fn(), count: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
    order: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
    product: { findFirst: jest.fn(), findUnique: jest.fn(), count: jest.fn(), update: jest.fn() },
    vote: { findMany: jest.fn() },
};

jest.unstable_mockModule('../lib/prisma.js', () => ({
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock
}));

jest.unstable_mockModule('../services/stellar/escrow.service.js', () => ({
  EscrowService: jest.fn().mockImplementation(() => ({
    getEscrow: jest.fn().mockResolvedValue({ status: 1 }),
    buildCreateEscrowTx: jest.fn().mockResolvedValue({ xdr: 'MOCK_XDR', classicFallback: false }),
    submitTransaction: jest.fn().mockResolvedValue({ hash: 'MOCK_TX_HASH', status: 'SUCCESS' }),
  })),
  escrowService: {
    getEscrow: jest.fn().mockResolvedValue({ status: 1 }),
    buildCreateEscrowTx: jest.fn().mockResolvedValue({ xdr: 'MOCK_XDR', classicFallback: false }),
    submitTransaction: jest.fn().mockResolvedValue({ hash: 'MOCK_TX_HASH', status: 'SUCCESS' }),
  }
}));

jest.unstable_mockModule('../services/stellar/smartContract.handler.stellar.js', () => ({
  horizonServer: {
    loadAccount: jest.fn().mockResolvedValue({ sequence: '100', balances: [] }),
    submitTransaction: jest.fn().mockResolvedValue({ hash: 'MOCK_TX_HASH' }),
  },
  server: {
    getAccount: jest.fn().mockResolvedValue({ sequenceNumber: () => '100' }),
    prepareTransaction: jest.fn().mockImplementation(tx => Promise.resolve(tx)),
    simulateTransaction: jest.fn().mockResolvedValue({ result: { retval: { status: 1 } } }),
  },
  STACK_ADMIN_SECRET: 'SC4AI3NPZLJKUF2K5HSCJNTD6RRYY3HFP3YC5EYWW5XBDJ3AIFSPC5CS',
  adminSequenceManager: {
    getSequence: jest.fn().mockResolvedValue('100'),
    refresh: jest.fn().mockResolvedValue(undefined),
    buildTransaction: jest.fn().mockResolvedValue({ sign: jest.fn() }),
  },
  saveContractWithWallet: jest.fn().mockResolvedValue({ hash: 'MOCK_TX_HASH' }),
  getLatestData: jest.fn().mockResolvedValue({ status: 1 }),
  registerProduct: jest.fn().mockResolvedValue({ hash: 'MOCK_TX_HASH' }),
  verifyProductProof: jest.fn().mockResolvedValue({ hash: 'MOCK_TX_HASH' }),
}));

const mod = await import('../app.js');
const app = mod.default;

describe('Contracts & Blockchain Routes', () => {
  it('GET /api/contracts/escrow/:taskId → returns mock escrow data', async () => {
    const res = await request(app).get('/api/contracts/escrow/MOCK_TASK_ID');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
