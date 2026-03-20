/**
 * Contract API routes tests.
 * Mocking Soroban API for Stellar escrow interactions.
 */
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.ATS = 'test_access_secret_12345';
process.env.RTS = 'test_refresh_secret_67890';
process.env.BLOCKCHAIN_NETWORK = 'https://horizon-testnet.stellar.org';
process.env.SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

jest.mock('nanoid', () => ({ nanoid: () => 'test-id-' + Math.random().toString(36).slice(2) }));
jest.mock('multiformats');

// ESM-safe mock for Stellar SDK (must be registered before importing app)
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
  Horizon: {
    Server: class {
      constructor() {}
    },
  },
  rpc: {
    Server: class {
      constructor() {}
    },
  },
  SorobanRpc: {
    Server: class {
      getAccount = jest.fn<any>().mockResolvedValue({});
      getNetwork = jest.fn<any>().mockResolvedValue({ passphrase: 'Test SDF Network ; September 2015' });
      prepareTransaction = jest.fn<any>().mockResolvedValue({ toXDR: () => 'MOCK_XDR' });
      sendTransaction = jest.fn<any>().mockResolvedValue({ status: 'PENDING', hash: 'MOCK_HASH' });
      getTransaction = jest.fn<any>().mockResolvedValue({ status: 'SUCCESS' });
    },
  },
  TransactionBuilder: class {
    addOperation = jest.fn().mockReturnThis();
    setTimeout = jest.fn().mockReturnThis();
    build = jest.fn().mockReturnValue({ toXDR: () => 'MOCK_XDR', sign: jest.fn() });
  },
  BASE_FEE: '100',
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
}));

let app: any;

beforeAll(async () => {
  const mod = await import('../app.js');
  app = mod.default;
});

describe('Contract routes - Escrow (Mocked)', () => {

  it('POST /api/contracts/escrow/create-escrow/xdr → validates input', async () => {
    // Missing body fields test
    const res = await request(app).post('/api/contracts/escrow/create-escrow/xdr').send({});
    // Should return 400 bad request if validation fails, or 500 if unhandled
    expect(res.status).toBe(400);
  });

  it('POST /api/contracts/escrow/release → validates input', async () => {
    const res = await request(app).post('/api/contracts/escrow/release').send({});
    expect(res.status).toBe(400);
  });

});
