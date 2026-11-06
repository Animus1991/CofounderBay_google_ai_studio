import { expect, test, type Page } from '@playwright/test';

/**
 * Round 23 on Workspace: ?tab= deep-links a section (the assistant's
 * "Workspace → Canvas" links now land on the canvas, not the dashboard),
 * tab clicks keep the URL shareable, and the phone layout stays clean.
 */
async function sample(page: Page, path: string) {
 await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
 await page.goto(path);
 await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

test('?tab=canvas opens the Lean Canvas section', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/workspace?tab=canvas');
 await expect(page.getByRole('tab', { name: 'Canvas' })).toHaveAttribute('aria-selected', 'true');
 await expect(page.getByText('Problem').first()).toBeVisible();
});

test('?tab=milestones opens the milestones board', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/workspace?tab=milestones');
 await expect(page.getByRole('tab', { name: 'Milestones' })).toHaveAttribute('aria-selected', 'true');
});

test('clicking a tab updates the shareable URL', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/workspace');
 await page.getByRole('tab', { name: 'Calendar' }).click();
 await expect(page).toHaveURL(/tab=calendar/);
 await expect(page.getByRole('tab', { name: 'Calendar' })).toHaveAttribute('aria-selected', 'true');
 // Dashboard is the default: its param clears again.
 await page.getByRole('tab', { name: 'Dashboard' }).click();
 await expect(page).not.toHaveURL(/tab=/);
});

test('no overflow on a phone', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 });
 await sample(page, '/workspace');
 const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});
