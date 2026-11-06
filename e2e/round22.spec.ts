import { expect, test, type Page } from '@playwright/test';

/**
 * Round 22 on Programs: "Mine" lists the tracked applications (the same list
 * Fundraising and Founder Tools read) with remove+Undo, "Open only" filters
 * by real deadline, and ?program= deep-links a card highlighted.
 */
async function sample(page: Page, path: string, seed?: Record<string, unknown>) {
 await page.addInitScript((entries) => {
  localStorage.setItem('demo_mode', 'true');
  for (const [key, value] of Object.entries(entries ?? {})) localStorage.setItem(key, JSON.stringify(value));
 }, seed ?? {});
 await page.goto(path);
 await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

const TRACKED = [{
 id: 1,
 program: 'FinTech Accelerator Q3 2026',
 type: 'Accelerator',
 status: 'draft',
 deadline: '—',
 decision: '—',
 match: 0,
 note: '',
}];

test('?program= highlights the program card', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/programs?program=2');
 const card = page.locator('#program-2');
 await expect(card).toBeVisible();
 await expect(card).toContainText('CleanTech Innovation Grant');
});

test('the Mine tab lists tracked applications and remove offers Undo', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/programs', { 'cfb.trackedApplications': TRACKED });
 await page.getByRole('button', { name: /Mine/ }).click();
 await expect(page.getByText('FinTech Accelerator Q3 2026')).toBeVisible();
 await expect(page.getByText('draft')).toBeVisible();
 // Remove → Undo toast → the row returns.
 await page.getByRole('button', { name: /Remove FinTech/ }).click();
 await expect(page.getByText('removed')).toBeVisible({ timeout: 10_000 });
 await page.getByRole('button', { name: 'Undo' }).click();
 await expect(page.getByText('FinTech Accelerator Q3 2026', { exact: true })).toBeVisible();
 // Open jumps back to the catalog card.
 await page.getByRole('button', { name: 'Open', exact: true }).click();
 await expect(page.locator('#program-1')).toBeVisible();
});

test('open-only toggle and share link', async ({ page, context }) => {
 await context.grantPermissions(['clipboard-read', 'clipboard-write']);
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/programs');
 const openOnly = page.getByRole('button', { name: /Open only/ });
 await openOnly.click();
 await expect(openOnly).toHaveAttribute('aria-pressed', 'true');
 await expect(page.locator('#program-1')).toBeVisible(); // demo deadlines are in the future
 await page.locator('#program-1').getByRole('button', { name: 'Share program' }).click();
 await expect(page.getByText('Program link copied')).toBeVisible({ timeout: 10_000 });
 const clip = await page.evaluate(() => navigator.clipboard.readText());
 expect(clip).toContain('/programs?program=1');
});

test('no overflow on a phone', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 });
 await sample(page, '/programs');
 const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});
