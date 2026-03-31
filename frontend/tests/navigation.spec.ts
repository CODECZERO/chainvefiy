import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
    test('should navigate to Marketplace page', async ({ page }) => {
        await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/.*marketplace/);
        // Updated selector based on DOM audit: Marketplace uses "Verified Products" in its hero
        await expect(page.getByText(/Verified Products/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('should navigate to Leaderboard', async ({ page }) => {
        await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/.*leaderboard/);
        // Updated text matching the 2026 UI: "Protocol Guardians"
        await expect(page.getByText(/Protocol Guardians/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('should display Connect Wallet button on Home', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: /Connect Wallet/i }).first()).toBeVisible();
    });

    test('should show guest bar when not logged in', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/You are browsing as a guest/i)).toBeVisible();
    });

    test('guest nav shows public links', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('link', { name: /^Marketplace$/i }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /^Community$/i }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /^Leaderboard$/i }).first()).toBeVisible();
    });

    test('guest clicking Supplier Login opens auth modal', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        
        // Click the button in the main header specifically to avoid guest bar ambiguity
        const headerLogin = page.locator('header').getByRole('button', { name: /Supplier Login/i });
        await headerLogin.waitFor({ state: 'visible' });
        await headerLogin.click();
        
        // Use role-based dialog check which is most robust for Radix/Shadcn UI
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 15000 });
        await expect(dialog.getByText(/Supplier Portal/i)).toBeVisible();
        await expect(dialog.getByRole('tab', { name: /Sign in/i })).toBeVisible();
    });

    test('formerly protected routes are now public for community verifiable access', async ({ page }) => {
        // Verification and bounty board are now completely public for wallet guest users
        await page.goto('/verify', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/Verify Products/i).first()).toBeVisible({ timeout: 15000 });

        await page.goto('/bounty-board', { waitUntil: 'domcontentloaded' });
        // Use more resilient text matching: heading is always there, but content might be empty
        await expect(page.getByRole('heading', { name: /Bounty Board/i })).toBeVisible({ timeout: 15000 });
        // Handle empty database case gracefully: accepts either "Available Bounties" or "No bounties found"
        await expect(page.getByText(/(Available Bounties|No bounties found)/i).first()).toBeVisible({ timeout: 15000 });
    });
});
