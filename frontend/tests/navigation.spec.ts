import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
    test('should navigate to Marketplace page', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/.*marketplace/);
        await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Leaderboard', async ({ page }) => {
        await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/.*leaderboard/);
        await expect(page.getByText(/Top Verifiers|Leaderboard/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('should display Connect Wallet button on Home', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        // Button shows "Connect" on small viewport, "Connect Wallet" on larger (responsive header)
        const connectBtn = page.getByRole('button', { name: /Connect(\s+Wallet)?/i });
        await expect(connectBtn).toBeVisible({ timeout: 10000 });
    });

    test('should show guest bar when not logged in', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/browsing as a guest/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('guest nav shows public links', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('link', { name: /^Marketplace$/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /^Community$/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /^Leaderboard$/i })).toBeVisible();
    });

    test('guest clicking protected nav opens sign-in modal', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await page.getByRole('button', { name: /Verify/i }).click();
        await expect(page.getByRole('heading', { name: /Sign in to Pramanik/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Sign in/i })).toBeVisible();
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: /Bounties/i }).click();
        await expect(page.getByRole('heading', { name: /Sign in to Pramanik/i })).toBeVisible();
    });

    test('protected routes should redirect when unauthenticated', async ({ page }) => {
        await page.goto('/seller-dashboard', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/Overview|My Listings|Earnings/i).first()).toHaveCount(0);

        await page.goto('/verify', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/Verify Products/i).first()).toHaveCount(0);

        await page.goto('/bounty-board', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/Earn rewards by improving Pramanik/i).first()).toHaveCount(0);

        await page.goto('/profile', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/My profile/i).first()).toHaveCount(0);
    });
});
