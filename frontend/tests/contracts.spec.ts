import { test, expect } from '@playwright/test';

/**
 * Frontend tests for contract-related UI: donation flow (escrow), wallet connect, Reiatsu.
 * These pages interact with Stellar/Soroban contracts (escrow, tokens) via the backend.
 */
test.describe('Contract-related UI', () => {
    test('Marketplace page loads', async ({ page }) => {
        await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/Open Marketplace|Verified Products/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('Home or nav exposes wallet connect for contract interactions', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        const connectBtn = page.getByRole('button', { name: /Connect Wallet/i }).first();
        await expect(connectBtn).toBeVisible({ timeout: 10000 });
    });

    test('Community page loads', async ({ page }) => {
        await page.goto('/community', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/Global Community|Decentralized Discourse/i).first()).toBeVisible({ timeout: 15000 });
    });
});
