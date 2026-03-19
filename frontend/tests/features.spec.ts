import { test, expect } from '@playwright/test';

// Create Post (NGO) test removed: requires running server + Pinata for uploads.
test.describe('Advanced Features Flow', () => {
    test('should load Marketplace', async ({ page }) => {
        await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/Marketplace/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('should load Community page', async ({ page }) => {
        await page.goto('/community', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/Community/i).first()).toBeVisible({ timeout: 15000 });
    });
});
