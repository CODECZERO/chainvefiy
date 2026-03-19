import { test, expect } from '@playwright/test';

test.describe('Visitor Flow', () => {
    test('should load homepage and navigate to bounty board', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(/Pramanik/i, { timeout: 10000 });
        await expect(page.getByText(/Pramanik/i).first()).toBeVisible({ timeout: 10000 });

        // bounty-board is protected; unauth should not see the page content
        await page.goto('/bounty-board', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/Earn rewards by improving Pramanik/i).first()).toHaveCount(0);
    });
});
