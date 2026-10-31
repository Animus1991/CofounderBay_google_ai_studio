import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Founder Tools tiles open working tools (they used to only record a
 * "recently used" entry), the numbers agree with Fundraising and the
 * assistant, and the readiness index is the same five-dimension score.
 * Sample account, no sign-in and no model needed.
 */

async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

test('a tile opens the SAFE calculator with the round\'s own terms and post-money math', async ({ page }) => {
  await sample(page, '/founder-tools?tab=tools');
  await page.getByTestId('founder-tool-safe').click();
  const dialog = page.getByRole('dialog', { name: 'SAFE Note' });
  await expect(dialog).toBeVisible();
  // Sample round: $450k committed at a $12M post-money cap.
  await expect(dialog.getByTestId('safe-ownership')).toHaveText('3.75%');
  await expect(page).toHaveURL(/tool=safe/);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('Fundraising shows the same SAFE ownership and opens the calculator', async ({ page }) => {
  await sample(page, '/fundraising');
  await page.getByRole('button', { name: /Insights and planning/ }).click();
  await expect(page.getByTestId('safe-card-ownership')).toHaveText('3.75%');
  await page.getByRole('button', { name: 'Open calculator' }).click();
  await expect(page.getByRole('dialog', { name: 'SAFE Note' })).toBeVisible();
});

test('the cap table models a priced round and the readiness index shows its basis', async ({ page }) => {
  await sample(page, '/founder-tools?tab=tools&tool=captable');
  const dialog = page.getByRole('dialog', { name: 'Cap Table' });
  await expect(dialog.getByTestId('captable-today')).toContainText('3.75%');
  await expect(dialog.getByTestId('captable-priced')).toContainText('New investors');
  await page.keyboard.press('Escape');
  await page.goto('/founder-tools');
  await expect(page.getByTestId('readiness-score')).toHaveText('68');
  await expect(page.getByTestId('readiness-coverage')).toContainText('5 of 5 dimensions');
});

test('a document tool opens its outline with honest actions', async ({ page }) => {
  await sample(page, '/founder-tools?tab=tools');
  await page.getByTestId('founder-tool-nda').click();
  const dialog = page.getByRole('dialog', { name: 'NDA Generator' });
  await expect(dialog.getByText(/not legal advice/)).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /Download outline/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.doc$/);
});
