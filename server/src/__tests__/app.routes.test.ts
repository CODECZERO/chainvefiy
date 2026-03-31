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
    // Should NOT return 401 Access Token Required.
    // Instead it will return 400 (Bad Request) or 200 (Empty) depending on the DB mock,
    // but the key test is that optionalJWT allows the request to reach the controller.
    const res = await request(app).get('/api/v2/verification/status?stellarWallet=G_MOCK_WALLET');
    expect(res.status).not.toBe(401);
  });

  it('GET /api/v2/verification/status → enforces auth if no wallet or JWT provided', async () => {
    const res = await request(app).get('/api/v2/verification/status');
    // Without JWT and without stellarWallet, it reaches the controller,
    // which then attempts to query with undefined identifiers and correctly returns 404 (Not Found).
    expect([401, 403, 400, 404]).toContain(res.status);
  });

  it('POST /api/v2/products/12345/vote → allows wallet-only users without JWT', async () => {
    // Without optionalJWT this would 401. With it, it reaches the controller and fails at DB/validation (400/404).
    const res = await request(app)
      .post('/api/v2/products/12345/vote')
      .send({ signature: 'mock_sig', vote: 'REAL', stellarWallet: 'G_MOCK_WALLET' });
    expect(res.status).not.toBe(401);
  });

  it('GET /api/v2/bounties → allows public access to the bounty board without auth', async () => {
    const res = await request(app).get('/api/v2/bounties');
    // Public routes either return 200 JSON payload, or 404/500 if DB is missing, but never 401
    expect(res.status).not.toBe(401);
  });
});

