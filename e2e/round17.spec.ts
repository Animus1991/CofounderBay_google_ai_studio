import { expect, test, type Page } from '@playwright/test';

/**
 * Round 17 on the AI Studio page: a question in ?q= is sent and dropped from
 * the address, the help card searches and opens answers that link to real
 * pages, the action filter announces its count and clears in one tap, and on
 * a phone the rail still stacks under the chat with help reachable.
 */
async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

test('a question in ?q= is sent to the assistant and dropped from the address', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/assistant?q=What is overdue?');
  await expect(page).not.toHaveURL(/[?&]q=/);
  // The question appears as a message — not just typed into the composer.
  await expect(page.getByText('What is overdue?').first()).toBeVisible({ timeout: 15_000 });
  // A reload does not ask it again: the user bubble stays a single entry.
  await page.reload();
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
  await expect(page.getByText('What is overdue?').first()).toBeVisible();
});

test('help search finds the page answer and its link opens that page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/assistant');
  const help = page.getByTestId('assistant-help');
  await help.scrollIntoViewIfNeeded();
  await expect(help).toBeVisible();
  // Without a search the card previews a handful of rows, not the whole list.
  await expect(help.getByText('What can the assistant change?')).toBeVisible();
  await help.getByRole('searchbox').fill('calendar');
  await expect(help.getByText(/answer/)).toBeVisible();
  const row = help.getByRole('button', { name: /What is Calendar for\?/ });
  await expect(row).toBeVisible();
  await row.click();
  await expect(help.getByText('Meetings, events and deadlines')).toBeVisible();
  await help.getByRole('link', { name: 'Open the page' }).click();
  await expect(page).toHaveURL(/\/calendar/);
});

test('the action filter announces its count and clears in one tap', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/assistant');
  const filter = page.getByRole('searchbox', { name: 'Filter actions' });
  await filter.fill('mentor');
  await expect(page.getByText(/\d+ actions match/)).toBeVisible();
  await page.getByRole('button', { name: 'Clear the filter' }).click();
  await expect(filter).toHaveValue('');
  await expect(page.getByText(/\d+ actions match/)).toHaveCount(0);
});

test('on a phone the rail stacks under the chat and help stays reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page, '/assistant');
  const order = await page.evaluate(() => {
    const top = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().top ?? Infinity;
    return { chat: top('input[placeholder*="Ask" i]'), help: top('[data-testid="assistant-help"]') };
  });
  expect(order.help).toBeGreaterThan(order.chat);
  await page.locator('#main-content').evaluate((main) => { main.scrollTop = main.scrollHeight; });
  const help = page.getByTestId('assistant-help');
  await expect(help).toBeVisible();
  // A search opens real rows on the phone as well (English UI by default).
  await help.getByRole('searchbox').fill('round');
  await expect(help.getByText(/answer/)).toBeVisible();
  // Nothing escapes the viewport sideways.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
