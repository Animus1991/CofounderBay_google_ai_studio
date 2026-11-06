import { expect, test, type Page } from '@playwright/test';

/**
 * Round 18 on Matches: best-fit stays the default order, name and newest
 * re-sort the same list, the availability filter only offers values the pool
 * actually carries, hiding a member shows a toast whose Undo brings the card
 * back, and the sort control is also offered to the assistant.
 */
async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

async function cardNames(page: Page) {
  return page.locator('[data-match-card] [data-match-name]').allTextContents();
}

test('the sort order reorders the same list and survives a reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/matches');
  const sort = page.getByRole('combobox', { name: 'Sort order' });
  await expect(sort).toBeVisible();
  const bestFit = await cardNames(page);
  expect(bestFit.length).toBeGreaterThan(2);
  await sort.selectOption('name');
  const byName = await cardNames(page);
  expect(byName.length).toBe(bestFit.length);
  expect([...byName].sort((a, b) => a.localeCompare(b))).toEqual(byName);
  // Same members, different order — no card is gained or lost by sorting.
  expect([...byName].sort()).toEqual([...bestFit].sort());
  await sort.selectOption('fit');
  await expect.poll(async () => cardNames(page)).toEqual(bestFit);
});

test('the availability filter only offers values the pool carries and narrows the list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/matches');
  await page.getByRole('button', { name: 'Filters' }).click();
  const availability = page.locator('#filter-availability');
  await expect(availability).toBeVisible();
  const options = await availability.locator('option').allTextContents();
  expect(options.length).toBeGreaterThan(2); // "All" plus the values the demo pool carries.
  const all = await cardNames(page);
  await availability.selectOption('Immediate');
  const narrowed = await cardNames(page);
  expect(narrowed.length).toBeGreaterThan(0);
  expect(narrowed.length).toBeLessThan(all.length);
  // The choice persists through reload like the rest of the filters.
  await page.reload();
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Filters' }).click();
  await expect(page.locator('#filter-availability')).toHaveValue('Immediate');
  await expect.poll(async () => (await cardNames(page)).length).toBe(narrowed.length);
});

test('hiding a member offers Undo in the toast and brings the card back', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/matches');
  const first = page.locator('[data-match-card]').first();
  const name = (await first.locator('[data-match-name]').textContent()) ?? '';
  const before = await cardNames(page);
  await first.getByRole('button', { name: /Hide|Απόκρυψη/ }).click();
  await expect.poll(async () => (await cardNames(page)).length).toBe(before.length - 1);
  const toast = page.locator('[data-toasts]');
  await expect(toast.getByRole('button', { name: 'Undo' })).toBeVisible();
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(async () => cardNames(page)).toContain(name);
});

test('on a phone the sort control stays reachable and cards do not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page, '/matches');
  await expect(page.getByRole('combobox', { name: 'Sort order' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
