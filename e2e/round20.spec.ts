import { expect, test, type Page } from '@playwright/test';

/**
 * Round 20 on Communities: ?id= deep-links a community space, the share
 * button copies that link, the demo spaces show their sample posts, and the
 * joined tab keeps filtering to my communities.
 */
async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

test('?id= opens the community space directly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/communities?id=fintech-founders');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog).toContainText('Fintech Founders');
  // Sample posts authored by cast members, not an empty panel.
  await expect(dialog.getByText('Open-banking APIs worth reusing')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).not.toHaveURL(/[?&]id=/);
});

test('the share button copies the community link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/communities');
  await page.getByRole('button', { name: 'Share community' }).first().click();
  await expect(page.getByText('Link copied')).toBeVisible({ timeout: 10_000 });
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('/communities?id=');
  // The copied link opens that community.
  await page.goto(clip);
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
});

test('the joined tab filters to my communities', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/communities');
  await page.getByRole('button', { name: /joined/i }).click();
  await expect(page.getByText('Fintech Founders')).toBeVisible();
  await expect(page.getByText('SaaS Builders')).toBeVisible();
  await expect(page.getByText('AI & Machine Learning')).toHaveCount(0);
});

test('no overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page, '/communities');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
