import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Round 6 on a phone (390 × 844), sample account: the bottom tab bar, the
 * "finish your profile" bar, one-row tab strips, the Events quick chips and day
 * groups, and the saved-perks view.
 */
test.use({ viewport: { width: 390, height: 844 } });

async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

test('the tab bar reaches the main places and opens the menu', async ({ page }) => {
  await sample(page, '/dashboard');
  const bar = page.getByTestId('mobile-tab-bar');
  await expect(bar).toBeVisible();
  await bar.getByRole('link', { name: /Events/ }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(bar.getByRole('link', { name: /Events/ })).toHaveAttribute('aria-current', 'page');
  await bar.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('#primary-navigation')).toBeVisible();
  const results = await new AxeBuilder({ page }).include('[data-testid="mobile-tab-bar"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});

test('the profile bar names the next field and stays closed once dismissed', async ({ page }) => {
  await sample(page, '/dashboard');
  const bar = page.getByTestId('profile-progress-bar');
  await expect(bar).toContainText('Profile 95%');
  await bar.getByRole('button', { name: /Hide until the profile changes/ }).click();
  await expect(bar).toBeHidden();
  await page.goto('/events');
  await page.locator('h1').first().waitFor();
  await expect(page.getByTestId('profile-progress-bar')).toBeHidden();
});

test('tab strips stay on one row and keep the active tab in view', async ({ page }) => {
  await sample(page, '/network?tab=needs');
  const strip = page.locator('.scroll-tabs').first();
  // One row: every tab's top edge within a few pixels of the others (they used to wrap 40px apart).
  const tops = await strip.locator('> button').evaluateAll((buttons) => buttons.map((b) => b.getBoundingClientRect().top));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(8);
  const active = strip.locator('[aria-pressed="true"]');
  await expect(active).toContainText('Need cards');
  await expect(active).toBeInViewport();
});

test('events filter by one chip and read by day', async ({ page }) => {
  await sample(page, '/events');
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Online', exact: true }).click();
  await expect(page.locator('#event-list')).toContainText('Mastering the Seed Round Pitch');
  await expect(page.locator('#event-list')).not.toContainText('Startup Founders Networking Night');
  await page.getByRole('button', { name: 'London', exact: true }).click();
  await expect(page.locator('#event-list')).toContainText('Startup Founders Networking Night');
});

test('saved perks have their own view', async ({ page }) => {
  await sample(page, '/perks');
  await page.getByRole('button', { name: 'Save Stripe' }).click();
  await page.getByRole('button', { name: /Saved \(1\)/ }).click();
  await expect(page.getByRole('heading', { name: 'Stripe' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Notion' })).toBeHidden();
});
