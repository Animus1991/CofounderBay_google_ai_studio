import { test, expect } from '@playwright/test';

/**
 * Handoff 4 spot checks — demo mode, Greek UI unless noted:
 * I1 distinct cast portraits on /matches, D1 unobstructed /network names,
 * F1 dashboard "Now" chips + F2 slash list, D2 single h1 per page,
 * F3 settings export download, D3/F5 Greek admin headings.
 */

const demoEl = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cfb.lang', 'el');
  });
};

const demoEn = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cfb.lang', 'en');
  });
};

test('matches renders at least 9 distinct unsplash person images', async ({ page }) => {
  await demoEl(page);
  await page.goto('/matches');
  await page.waitForFunction(() => document.querySelectorAll('img[src*="images.unsplash.com"]').length >= 9, undefined, { timeout: 15000 });
  const srcs = await page.locator('img[src*="images.unsplash.com"]').evaluateAll((imgs) =>
    imgs.map((img) => (img as HTMLImageElement).src.split('?')[0]));
  expect(new Set(srcs).size).toBeGreaterThanOrEqual(9);
});

test('network names are not covered by avatars', async ({ page }) => {
  await demoEl(page);
  await page.goto('/network');
  await page.waitForTimeout(1500);
  const overlap = await page.evaluate(() => {
    const bad: string[] = [];
    for (const name of document.querySelectorAll('main h3, main h4')) {
      const nr = name.getBoundingClientRect();
      if (!nr.width || !nr.height) continue;
      const hit = document.elementFromPoint(nr.left + nr.width / 2, nr.top + nr.height / 2);
      if (hit && !name.contains(hit)) bad.push(name.textContent || '?');
    }
    return bad;
  });
  expect(overlap).toEqual([]);
});

test('dashboard shows Now chips with counts and slash opens the list', async ({ page }) => {
  await demoEl(page);
  await page.goto('/dashboard');
  const chips = page.getByRole('button', { name: /Μηνύματα ·|Ειδοποιήσεις ·|Αιτήματα ·/ });
  await expect(chips.first()).toBeVisible();
  expect(await chips.count()).toBeGreaterThanOrEqual(2);
  await expect(chips.first()).toContainText('·');

  const ask = page.getByTestId('dashboard-ask');
  await ask.fill('/');
  const list = page.locator('#dash-slash-list');
  await expect(list).toBeVisible();
  // The field points at the list only while it is open (a closed list has no id to point at).
  await expect(ask).toHaveAttribute('aria-controls', 'dash-slash-list');
  expect(await list.locator('[role="option"]').count()).toBeGreaterThan(3);
  await ask.press('Escape');
  await expect(list).toHaveCount(0);
  await expect(ask).not.toHaveAttribute('aria-controls', /.+/);
});

test('one h1 per page on five routes', async ({ page }) => {
  await demoEl(page);
  for (const route of ['/dashboard', '/matches', '/network', '/events', '/mentors']) {
    await page.goto(route);
    // Pages are lazy chunks: wait for the heading itself, not a fixed delay.
    await page.locator('h1').first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(300);
    const count = await page.locator('h1').count();
    expect(count, `${route} should have exactly one h1`).toBe(1);
  }
});

test('settings export downloads a JSON file with lists keys', async ({ page }) => {
  await demoEn(page);
  await page.goto('/settings?tab=privacy');
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await page.getByRole('button', { name: /Export my data/ }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^cofounderbay-data-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const payload = JSON.parse(readFileSync(path!, 'utf8'));
  expect(payload).toHaveProperty('profile');
  expect(payload.lists).toHaveProperty('requests');
  expect(payload.lists).toHaveProperty('sessions');
  expect(payload.lists).toHaveProperty('assistantFeedback');
});

test('admin renders no bare-English headings in Greek', async ({ page }) => {
  await demoEl(page);
  await page.goto('/admin');
  await page.waitForTimeout(1500);
  const headings = await page.locator('main h1, main h2, main h3').evaluateAll((els) =>
    els.map((el) => el.textContent?.trim() || '').filter(Boolean));
  const latin = headings.filter((h) => /[A-Za-z]{3,}/.test(h) && !/[΀-῿]/.test(h));
  expect(latin).toEqual([]);
});
