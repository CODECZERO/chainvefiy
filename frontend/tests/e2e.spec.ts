import { test, expect } from '@playwright/test';

test.describe('Visitor Flow', () => {
    test('should load homepage and navigate to bounty board', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(/Pramanik/i, { timeout: 10000 });
        await expect(page.getByText(/Pramanik/i).first()).toBeVisible({ timeout: 10000 });

        // Navigate to bounty board and verify it is public
        await page.goto('/bounty-board', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Bounty Board/i })).toBeVisible({ timeout: 15000 });
        // Handle empty database case gracefully: accepts either "Available Bounties" or "No bounties found"
        await expect(page.getByText(/(Available Bounties|No bounties found)/i).first()).toBeVisible({ timeout: 15000 });
    });
});
