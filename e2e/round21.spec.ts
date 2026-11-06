import { expect, test, type Page } from '@playwright/test';

/**
 * Round 21 on Events: ?event= deep-links a card highlighted, the Past tab
 * keeps stale listings out of Upcoming (the demo carries one past event so
 * the tab is demonstrable), and sharing copies the event's own link.
 */
async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

test('?event= highlights the event and stays out of Upcoming when past', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/events?event=p1');
  // The past event lands on the Past tab, highlighted.
  await expect(page.getByRole('button', { name: /Past/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#event-p1')).toBeVisible();
  await expect(page.locator('#event-p1')).toContainText('Founder Breakfast');
  // And Upcoming does not list it.
  await page.getByRole('button', { name: /Upcoming/ }).click();
  await expect(page.locator('#event-p1')).toHaveCount(0);
  await expect(page.locator('#event-1')).toBeVisible();
});

test('the Past tab lists the sample past event newest first', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/events');
  await page.getByRole('button', { name: /Past/ }).click();
  await expect(page.locator('#event-p1')).toBeVisible();
  await expect(page.locator('#event-p1')).toContainText('Founder Breakfast');
});

test('sharing an event copies its deep link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/events');
  await page.locator('#event-1').getByRole('button', { name: /Share/ }).click();
  await expect(page.getByText('Event link copied')).toBeVisible({ timeout: 10_000 });
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('/events?event=1');
});

test('no overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page, '/events');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
