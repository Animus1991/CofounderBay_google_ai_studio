import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Round 13, sample account: the match comparison (verdict first, same score as
 * Matches, a deep link the assistant uses), the phone calendar (one action for
 * the chosen day instead of a "+" in every cell) and the status at a glance on
 * match cards.
 */

async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

test('compare opens on the top three, names a leader and stays accessible', async ({ page }) => {
  await sample(page, '/matches/compare');
  const view = page.getByTestId('match-compare');
  await expect(view.locator('table')).toBeVisible();
  await expect(view.locator('thead th[scope="col"]')).toHaveCount(4);
  await expect(view).toContainText(/highest overall match at \d+%|η υψηλότερη συνολική αντιστοίχιση/);
  const axe = await new AxeBuilder({ page }).include('[data-testid="match-compare"]').analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});

test('a deep link compares exactly the people it names, and one can be removed', async ({ page }) => {
  await sample(page, '/matches/compare?ids=marcus-thorne,elena-rodriguez');
  const view = page.getByTestId('match-compare');
  await expect(view.locator('thead th[scope="col"]')).toHaveCount(3);
  await page.getByRole('button', { name: /Remove Elena Rodriguez|Αφαίρεση: Elena Rodriguez/ }).click();
  await expect(view).toContainText(/Pick at least two people|Διάλεξε τουλάχιστον δύο/);
  await expect(page).toHaveURL(/ids=marcus-thorne$/);
});

test('Matches opens the comparison from its header', async ({ page }) => {
  await sample(page, '/matches');
  await page.getByRole('button', { name: /^Compare$|^Σύγκριση$/ }).click();
  await expect(page).toHaveURL(/\/matches\/compare/);
  await expect(page.getByTestId('match-compare')).toBeVisible();
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the month has one Schedule action for the chosen day, not one per cell', async ({ page }) => {
    await sample(page, '/calendar');
    const panel = page.getByTestId('calendar-day-panel');
    await expect(panel).toBeVisible();
    // The per-day "+" is hidden below 640px; the panel carries the action.
    const perCell = page.locator('button[aria-label^="Schedule on"], button[aria-label^="Προγραμματισμός για"]');
    for (const button of await perCell.all()) await expect(button).toBeHidden();
    // Choosing another day moves the panel to it.
    const day = page.locator('button[aria-pressed]').filter({ hasText: /^15$/ }).first();
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'true');
    await expect(panel).toContainText(/15/);
  });

  test('match cards say which way a person is heading', async ({ page }) => {
    await sample(page, '/matches');
    await expect(page.getByText(/Seeking a co-founder|Ψάχνει συνιδρυτή/).first()).toBeVisible();
    await expect(page.getByText(/Wants to join a team|Θέλει να μπει σε ομάδα/).first()).toBeVisible();
  });
});
