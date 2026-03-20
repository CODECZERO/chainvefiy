/**
 * Pramanik — Server Integration Tests
 * =========================================
 * These tests hit the real Express app with NODE_ENV=test.
 * Uses Prisma for DB operations in test mode.
 */
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = 'test';
process.env.ATS = 'test_access_secret_12345';
process.env.RTS = 'test_refresh_secret_67890';

const HAS_DATABASE_URL = Boolean(process.env.DATABASE_URL);

const prisma = new PrismaClient();
jest.setTimeout(30000);

let app: any;

beforeAll(async () => {
    if (!HAS_DATABASE_URL) return;
    try {
        const mod = await import('../app.js');
        app = mod.default;
        // Verify DB connection
        await prisma.$connect();
        // Clean DB before tests
        await prisma.$transaction([
            prisma.order.deleteMany(),
            prisma.vote.deleteMany(),
            prisma.product.deleteMany(),
            prisma.supplier.deleteMany(),
            prisma.user.deleteMany(),
        ]);
    } catch (e) {
        console.error('Failed to connect to test database. Skipping tests that require DB.');
    }
});

afterAll(async () => {
    if (!HAS_DATABASE_URL) return;
    await prisma.$disconnect();
});

function generateTestToken(payload: object = {}): string {
    return jwt.sign(
        {
            id: 'test-user-id',
            email: 'test@pramanik.app',
            role: 'BUYER',
            ...payload,
        },
        process.env.ATS!,
        { expiresIn: '1h' }
    );
}

describe.skip(!HAS_DATABASE_URL)('Health Check', () => {
    it('GET /health → 200 with success=true', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/Pramanik API is running/i);
    });
});

describe.skip(!HAS_DATABASE_URL)('User API', () => {
    it('POST /api/user/signup → creates user in PostgreSQL', async () => {
        const res = await request(app).post('/api/user/signup').send({
            email: 'buyer@test.com',
            password: 'password123',
            role: 'BUYER'
        });
        expect([200, 201]).toContain(res.status);
        const userCount = await prisma.user.count({ where: { email: 'buyer@test.com' } });
        expect(userCount).toBe(1);
    });

    it('POST /api/user/login → returns JWT', async () => {
        const res = await request(app).post('/api/user/login').send({
            email: 'buyer@test.com',
            password: 'password123'
        });
        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeDefined();
    });
});

describe.skip(!HAS_DATABASE_URL)('Product API', () => {
    let supplierUser: any;
    let supplier: any;

    beforeAll(async () => {
        supplierUser = await prisma.user.create({
            data: { email: 'supplier@test.com', passwordHash: 'hash', role: 'SUPPLIER', whatsappNumber: '+1234567890' }
        });
        supplier = await prisma.supplier.create({
            data: { userId: supplierUser.id, name: 'Test Farm', whatsappNumber: '+1234567890', location: 'India' }
        });
    });

    it('POST /api/products → creates product with Prisma', async () => {
        const token = generateTestToken({ id: supplierUser.id, role: 'SUPPLIER' });
        const res = await request(app)
            .post('/api/products')
            .set('Cookie', `accessToken=${token}`)
            .send({
                title: 'Test Turmeric',
                description: 'Organic Turmeric',
                category: 'Food & Spices',
                priceInr: 500,
                quantity: '1 kg',
            });
        expect([200, 201]).toContain(res.status);
        const productCount = await prisma.product.count({ where: { title: 'Test Turmeric' } });
        expect(productCount).toBe(1);
    });

    it('GET /api/products → returns list from PostgreSQL', async () => {
        const res = await request(app).get('/api/products');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data?.products)).toBe(true);
    });

    it('POST /api/products/:id/vote → updates vote counts in PostgreSQL', async () => {
        const product = await prisma.product.findFirst();
        const voter = await prisma.user.create({ data: { email: 'voter@test.com', role: 'BUYER' } });
        const token = generateTestToken({ id: voter.id });

        const res = await request(app)
            .post(`/api/products/${product?.id}/vote`)
            .set('Cookie', `accessToken=${token}`)
            .send({ voteType: 'REAL' });

        expect(res.status).toBe(200);
        const updatedProduct = await prisma.product.findUnique({ where: { id: product?.id } });
        expect(updatedProduct?.voteReal).toBe(1);
    });
});

describe.skip(!HAS_DATABASE_URL)('Stats API', () => {
    it('GET /api/stats → returns counts from PostgreSQL', async () => {
        const res = await request(app).get('/api/stats');
        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data).toHaveProperty('totalTrustTokens');
        expect(res.body.data).toHaveProperty('avgVerifyTime');
    });
});

describe.skip(!HAS_DATABASE_URL)('Community Queue', () => {
     it('GET /api/community/queue → returns pending products', async () => {
         const res = await request(app).get('/api/community/queue');
         expect(res.status).toBe(200);
         expect(Array.isArray(res.body.data)).toBe(true);
     });

     it('GET /api/community/leaderboard → returns top verifiers with accuracy', async () => {
        const res = await request(app).get('/api/community/leaderboard');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        if (res.body.data.length > 0) {
            expect(res.body.data[0]).toHaveProperty('accuracy');
            expect(res.body.data[0]).toHaveProperty('votes');
        }
    });
});
