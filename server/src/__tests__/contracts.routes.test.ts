import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.BLOCKCHAIN_NETWORK = 'https://horizon-testnet.stellar.org';
process.env.SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

// Mock Stellar SDK
jest.unstable_mockModule('@stellar/stellar-sdk', () => ({
  Keypair: {
    random: () => ({ publicKey: () => 'G_MOCK', secret: () => 'S_MOCK' }),
    fromSecret: () => ({ publicKey: () => 'G_MOCK', secret: () => 'S_MOCK' }),
  },
  Account: class { constructor() {} },
  Asset: class { constructor() {} },
  Memo: { text: () => ({}) },
  Operation: {
    payment: () => ({}),
    createAccount: () => ({}),
    changeTrust: () => ({}),
  },
  Address: class {
    constructor() {}
    toScVal() { return {}; }
  },
  Contract: class {
    constructor() {}
    call() { return {}; }
  },
  nativeToScVal: () => ({}),
  scValToNative: () => ({}),
  xdr: {
    ScVal: {
      fromXdr: () => ({}),
    },
  },
  TimeoutInfinite: 0,
  Horizon: { Server: class { constructor() {} } },
  rpc: { Server: class { constructor() {} } },
  SorobanRpc: { Server: class { constructor() {} } },
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  BASE_FEE: '100',
  TransactionBuilder: class {
    constructor() {}
    addOperation() { return this; }
    addMemo() { return this; }
    setTimeout() { return this; }
    build() { return { toXDR: () => 'MOCK_XDR', sign: () => undefined }; }
  },
}));

// Mock Prisma
jest.unstable_mockModule('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    order: { findUnique: jest.fn(), update: jest.fn() },
    product: { findUnique: jest.fn() },
  },
  default: {
    user: { findUnique: jest.fn() },
    order: { findUnique: jest.fn(), update: jest.fn() },
    product: { findUnique: jest.fn() },
  }
}));

const mod = await import('../app.js');
const app = mod.default;

describe('Contracts & Blockchain Routes', () => {
  it('GET /api/v2/contracts/escrow/status → returns contract ID', async () => {
    process.env.ESCROW_CONTRACT_ID = 'C_MOCK_ESCROW';
    const res = await request(app).get('/api/v2/contracts/escrow/status');
    expect(res.status).toBe(200);
    expect(res.body.contractId).toBe('C_MOCK_ESCROW');
  });

  it('POST /api/v2/contracts/escrow/prepare → returns prepared XDR', async () => {
    const res = await request(app)
      .post('/api/v2/contracts/escrow/prepare')
      .send({ orderId: '123', buyerWallet: 'G_BUYER' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.xdr).toBe('MOCK_XDR');
  });
});
