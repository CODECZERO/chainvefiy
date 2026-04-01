import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

process.env.NODE_ENV = 'test';

// ESM-safe mock for Stellar SDK (app boot imports Stellar services)
import { jest } from '@jest/globals';
jest.unstable_mockModule('@stellar/stellar-sdk', () => ({
  Keypair: {
    random: () => ({ publicKey: () => 'G_MOCK', secret: () => 'S_MOCK' }),
    fromSecret: () => ({ publicKey: () => 'G_MOCK', secret: () => 'S_MOCK' }),
  },
  Account: class {
    constructor() {}
  },
  Asset: class {
    constructor() {}
  },
  Memo: {
    text: () => ({}),
  },
  Operation: {
    payment: () => ({}),
    createAccount: () => ({}),
    changeTrust: () => ({}),
  },
  Address: class {
    constructor() {}
    toScVal() {
      return {};
    }
  },
  Contract: class {
    constructor() {}
    call() {
      return {};
    }
  },
  nativeToScVal: () => ({}),
  scValToNative: () => ({}),
  xdr: {},
  TimeoutInfinite: 0,
  Horizon: { Server: class { constructor() {} } },
  rpc: { Server: class { constructor() {} } },
  SorobanRpc: { Server: class { constructor() {} } },
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  BASE_FEE: '100',
  TransactionBuilder: class {
    constructor() {}
    addOperation() {
      return this;
    }
    addMemo() {
      return this;
    }
    setTimeout() {
      return this;
    }
    build() {
      return { toXDR: () => 'MOCK_XDR', sign: () => undefined };
    }
  },
}));

jest.unstable_mockModule('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    order: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    product: { count: jest.fn() },
    qRScan: { findMany: jest.fn() },
    trustTokenLedger: { aggregate: jest.fn() }
  },
  default: {
    user: { findUnique: jest.fn() },
    order: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    product: { count: jest.fn() },
    qRScan: { findMany: jest.fn() },
    trustTokenLedger: { aggregate: jest.fn() }
  }
}));

let app: any;

beforeAll(async () => {
  const mod = await import('../app.js');
  app = mod.default;
});

describe('App routes (no DB)', () => {
  it('GET / → returns Pramanik API info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Pramanik API is active/i);
  });

  it('GET /health → returns success', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /does-not-exist → returns 404', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/test/delay?ms=10 → delays (test-only route)', async () => {
    const res = await request(app).get('/api/test/delay?ms=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.delayed).toBe(10);
  });
});

describe('New Features & Auth Bypasses', () => {
  it('GET /api/v2/verification/status → allows wallet-only users without JWT', async () => {
    const res = await request(app).get('/api/v2/verification/status?stellarWallet=G_MOCK_WALLET');
    expect(res.status).not.toBe(401);
  });

  it('GET /api/v2/verification/status → enforces auth if no wallet or JWT provided', async () => {
    const res = await request(app).get('/api/v2/verification/status');
    expect([401, 403, 400, 404]).toContain(res.status);
  });

  it('POST /api/v2/products/12345/vote → allows wallet-only users without JWT', async () => {
    const res = await request(app)
      .post('/api/v2/products/12345/vote')
      .send({ signature: 'mock_sig', vote: 'REAL', stellarWallet: 'G_MOCK_WALLET' });
    expect(res.status).not.toBe(401);
  });

  it('GET /api/v2/bounties → allows public access to the bounty board without auth', async () => {
    const res = await request(app).get('/api/v2/bounties');
    expect(res.status).not.toBe(401);
  });
});
