import { expect, test, type Page } from '@playwright/test';

/**
 * Round 19 on Network: the status filter is an explicit select instead of a
 * cycling button, and a saved profile's note can be edited in place and keeps
 * its text through a reload.
 */
async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

test('the status filter lists every status and narrows the grid', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/network');
  const select = page.getByRole('combobox', { name: 'Filter by status' });
  await expect(select).toBeVisible();
  // All four statuses are named options — nothing hides behind repeated taps.
  await expect(select.locator('option')).toHaveCount(4);
  await select.selectOption('Connected');
  // James Wilson's is the only sent request; it leaves the grid.
  await expect(page.getByText('James Wilson')).toHaveCount(0);
  await select.selectOption('Pending');
  await expect(page.getByText('James Wilson')).toBeVisible();
  await expect(page.getByText('Sarah Chen')).toHaveCount(0);
  await select.selectOption('All');
  await expect(page.getByText('Sarah Chen')).toBeVisible();
});

test('a saved profile note edits in place and survives a reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/network?tab=saved');
  await page.getByRole('button', { name: 'Edit note about Mia Kovacs' }).click();
  const input = page.getByRole('textbox', { name: /Note about Mia Kovacs/ });
  await expect(input).toBeVisible();
  await input.fill('Met at the Athens meetup — follow up Friday');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText('Met at the Athens meetup — follow up Friday')).toBeVisible();
  await page.reload();
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
  await expect(page.getByText('Met at the Athens meetup — follow up Friday')).toBeVisible();
});

test('the network grid does not overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page, '/network');
  await expect(page.getByRole('combobox', { name: 'Filter by status' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
