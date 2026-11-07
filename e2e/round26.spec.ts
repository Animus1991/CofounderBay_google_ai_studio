import { expect, test, type Page } from '@playwright/test';

/**
 * Round 26: the deck keeps the founder's order, perks can lead with the stage,
 * a profile holds a portfolio, and an investor update starts from stored data.
 */
async function sample(page: Page, path: string, seed?: Record<string, unknown>) {
 await page.addInitScript((entries) => {
  localStorage.setItem('demo_mode', 'true');
  for (const [key, value] of Object.entries(entries ?? {})) localStorage.setItem(key, JSON.stringify(value));
 }, seed ?? {});
 await page.goto(path);
 await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

test('a slide moves, stays open, and the order survives a reload', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/founder-tools?tab=pitch&slide=problem');
 await page.getByRole('button', { name: 'Move this slide up' }).click();
 const order = await page.evaluate(() => JSON.parse(localStorage.getItem('cfb.pitchOrder') ?? '[]'));
 expect(order.slice(0, 2)).toEqual(['problem', 'cover']);
 await expect(page.getByRole('button', { name: 'Move this slide up' })).toBeDisabled();
 await page.reload();
 await page.locator('h1').first().waitFor();
 expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cfb.pitchOrder') ?? '[]')[0])).toBe('problem');
});

test('perks can lead with what suits the stage', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/perks');
 const toggle = page.getByRole('button', { name: 'First for my stage' });
 await expect(toggle).toBeVisible();
 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

test('work is added to the portfolio, kept, and removed', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/profile');
 const section = page.getByTestId('profile-portfolio');
 await section.getByRole('button', { name: 'Add work' }).click();
 await section.getByRole('textbox', { name: 'Title' }).fill('Harbor pilot');
 await section.getByRole('textbox', { name: 'Your role' }).fill('Product lead');
 await section.getByRole('textbox', { name: 'Link', exact: true }).fill('javascript:alert(1)');
 await section.getByRole('button', { name: 'Add', exact: true }).click();
 await expect(section.getByRole('alert')).toBeVisible();
 await section.getByRole('textbox', { name: 'Link', exact: true }).fill('https://example.test/harbor');
 await section.getByRole('button', { name: 'Add', exact: true }).click();
 await expect(section.getByText('Harbor pilot')).toBeVisible();
 await page.reload();
 await page.locator('h1').first().waitFor();
 await expect(page.getByTestId('profile-portfolio').getByText('Harbor pilot')).toBeVisible();
 await page.getByRole('button', { name: 'Remove Harbor pilot' }).click();
 await expect(page.getByTestId('profile-portfolio').getByText('Harbor pilot')).toHaveCount(0);
});

test('an investor update drafts from the stored round', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/fundraising');
 await page.getByTestId('investor-update-open').click();
 const text = page.getByTestId('investor-update-text');
 await expect(text).toBeVisible();
 await expect(text).toHaveValue(/Investor update/);
 await text.fill('Edited by hand');
 await expect(text).toHaveValue('Edited by hand');
 const download = page.waitForEvent('download');
 await page.getByRole('button', { name: 'Download', exact: true }).click();
 expect((await download).suggestedFilename()).toBe('investor-update.md');
});

for (const path of ['/founder-tools?tab=pitch', '/fundraising', '/profile']) {
 test(`${path} does not scroll sideways on a phone`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page, path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
 });
}
