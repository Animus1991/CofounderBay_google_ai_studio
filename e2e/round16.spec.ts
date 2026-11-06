import { expect, test, type Page } from '@playwright/test';

/**
 * Round 16 on the dashboard: the merged agenda (one list, every kind), the
 * numbers row right under Today, the need-card row, the wide-screen two-column
 * layout, and the phone essentials still clearing the tab bar at the bottom.
 */
async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

async function openMore(page: Page) {
  const more = page.getByTestId('dashboard-more').getByRole('button').first();
  if (await more.count()) {
    await more.click();
    await expect(page.locator('#dashboard-more-panel')).toBeVisible();
  }
}

test('one agenda lists sessions, tasks and events with their badges', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await sample(page, '/dashboard');
  const agenda = page.getByTestId('dashboard-agenda');
  await expect(agenda).toBeVisible();
  // A stored session, a workspace task and a platform event in the same list.
  await expect(agenda.getByText('Co-founder Sync')).toBeVisible();
  await expect(agenda.getByText('Landing Page Copywriting')).toBeVisible();
  await expect(agenda.getByText('Downtown Pitch Club')).toBeVisible();
  await expect(agenda.getByText('Session', { exact: true }).first()).toBeVisible();
  await expect(agenda.getByText('Task', { exact: true }).first()).toBeVisible();
  await expect(agenda.getByText('MEETUP', { exact: true })).toBeVisible();
});

test('the need card sits in Today until one is open, and the numbers lead under Today', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/dashboard');
  const today = page.getByTestId('dashboard-today');
  await expect(today.getByText(/Who does your startup need/)).toBeVisible();
  await today.getByRole('button', { name: /Need cards/ }).click();
  await expect(page).toHaveURL(/\/network\?tab=needs/);
  await sample(page, '/dashboard');
  const numbers = page.getByTestId('dashboard-numbers');
  await expect(numbers).toBeVisible();
  // Numbers sit between Today and everything else (they used to be seventh).
  const order = await page.evaluate(() => {
    const pick = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().top ?? Infinity;
    return {
      today: pick('[data-testid="dashboard-today"]'),
      numbers: pick('[data-testid="dashboard-numbers"]'),
      agenda: pick('[data-testid="dashboard-agenda"]'),
    };
  });
  expect(order.numbers).toBeGreaterThan(order.today);
  expect(order.numbers).toBeLessThan(order.agenda);
});

test('at 1920 the dashboard runs a content column and a rail, never one stretched strip', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sample(page, '/dashboard');
  const columns = page.getByTestId('dashboard-columns');
  await expect(columns).toBeVisible();
  const widths = await columns.evaluate((el) => {
    const cols = [...el.children].map((child) => Math.round(child.getBoundingClientRect().width));
    return { outer: Math.round(el.getBoundingClientRect().width), cols };
  });
  expect(widths.cols).toHaveLength(2);
  const [mainWidth, railWidth] = widths.cols;
  // Roughly 1.6:1 — the feed column is wide, the rail stays glanceable.
  expect(mainWidth!).toBeGreaterThan(railWidth!);
  expect(railWidth!).toBeGreaterThanOrEqual(300);
  // The rail holds the glance cards: the person, the week, the views chart.
  const rail = columns.locator('> div').nth(1);
  await expect(rail.getByText(/worth meeting|Best match/)).toBeVisible();
  await expect(rail.getByTestId('dashboard-week')).toBeVisible();
  // Communities is the last card, full width under both columns — its rows
  // use the horizontal space and it stays last, the same as on a phone.
  const communities = page.getByTestId('dashboard-communities');
  await expect(communities).toBeVisible();
  const geo = await page.evaluate(() => {
    const cols = document.querySelector('[data-testid="dashboard-columns"]')!.getBoundingClientRect();
    const com = document.querySelector('[data-testid="dashboard-communities"]')!.getBoundingClientRect();
    return { colsBottom: cols.bottom, comTop: com.top, comWidth: com.width, colsWidth: cols.width };
  });
  expect(geo.comTop).toBeGreaterThanOrEqual(geo.colsBottom);
  expect(geo.comWidth).toBeGreaterThan(geo.colsWidth * 0.95);
});

test('on a phone the essentials lead and the last card still clears the tab bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page, '/dashboard');
  await expect(page.getByTestId('dashboard-today')).toBeVisible();
  await expect(page.getByTestId('dashboard-numbers')).toBeVisible();
  await expect(page.getByTestId('dashboard-agenda')).toBeVisible();
  await openMore(page);
  await page.locator('#main-content').evaluate((main) => { main.scrollTop = main.scrollHeight; });
  const card = page.getByRole('button', { name: /AI & Machine Learning/ });
  await expect(card).toBeVisible();
  const overlap = await card.evaluate((el) => {
    const bar = document.querySelector('[data-testid="mobile-tab-bar"]')!.getBoundingClientRect().top;
    const chat = document.querySelector('button[aria-label="Open studio assistant"]')?.getBoundingClientRect().top ?? bar;
    return el.getBoundingClientRect().bottom - Math.min(bar, chat);
  });
  expect(overlap).toBeLessThanOrEqual(0);
});
