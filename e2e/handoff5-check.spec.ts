import { test, expect } from '@playwright/test';

/**
 * Handoff 5 spot checks — demo mode, Greek UI:
 * A1 fundraising KPIs derive from the round, A2 one demo views number everywhere,
 * B1 events registration is live cfb:data state, C2 workspace Builder tab rows,
 * D page controls surface as "On this page" chips.
 */

const demoEl = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cfb.lang', 'el');
  });
};

test('fundraising KPIs match the seeded demo round', async ({ page }) => {
  await demoEl(page);
  await page.goto('/fundraising');
  await page.waitForTimeout(1500);
  const kpi = (label: string) => page.locator(`div:has(> p:text-is("${label}")) > p`).nth(1).innerText();
  // Non-Closed/Passed rows are exactly the rows that can move to a next stage.
  const activeRows = await page.locator('button[aria-label="Επόμενο στάδιο"]:visible').count();
  expect(Number(await kpi('Ενεργά leads'))).toBe(activeRows);
  expect(activeRows).toBe(4);
  expect(await kpi('Ρυθμός καύσης')).toBe('$22k/mo');
  expect(await kpi('Υπόλοιπο περιθώριο')).toBe('8mo');
});

test('profile views show the same number on dashboard, profile and insights', async ({ page }) => {
  await demoEl(page);

  await page.goto('/dashboard');
  await page.waitForTimeout(1200);
  const dashViews = await page.locator(':is(div, button):has(> :text-is("Προβολές προφίλ"))').last().innerText();

  await page.goto('/profile');
  await page.waitForTimeout(1200);
  const profileViews = await page.locator('div:has(> :text-is("Προβολές"))').filter({ hasText: 'Τελευταίες 7 ημέρες' }).innerText();

  await page.goto('/insights');
  await page.waitForTimeout(1200);
  const insightViews = await page.locator(':is(div, button):has(> :text-is("Προβολές προφίλ"))').last().innerText();

  for (const text of [dashViews, profileViews, insightViews]) {
    expect(text).toContain('174');
  }
});

test('events registration round-trips through cfb:data without reload', async ({ page }) => {
  await demoEl(page);
  await page.goto('/events');
  await page.waitForTimeout(1500);

  const register = page.getByRole('button', { name: 'Εγγραφή', exact: true }).first();
  await register.click();
  await expect(page.getByRole('button', { name: '✓ Εγγραφήκατε' }).first()).toBeVisible();

  const stored = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('cfb.registeredEvents'));
    return key ? localStorage.getItem(key) : null;
  });
  expect(stored).toBeTruthy();
  expect(JSON.parse(stored!).length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Οι εκδηλώσεις μου' }).click();
  await expect(page.locator('main').getByRole('button', { name: '✓ Εγγραφήκατε' }).first()).toBeVisible();

  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('cfb.registeredEvents')) localStorage.removeItem(key);
    }
    window.dispatchEvent(new Event('cfb:data'));
  });
  await page.getByRole('button', { name: 'Επερχόμενες' }).click();
  await expect(register).toBeVisible();
});

test('workspace builder tab lists modules and deep-links into founder tools', async ({ page }) => {
  await demoEl(page);
  await page.goto('/workspace');
  await page.waitForTimeout(1200);
  await page.getByRole('tab', { name: 'Δημιουργός' }).click();
  await expect(page.getByText('2 από 5 ενότητες ολοκληρωμένες')).toBeVisible();
  await expect(page.getByText('3/3').first()).toBeVisible();
  const cont = page.getByRole('link', { name: 'Συνέχεια' }).first();
  await expect(cont).toHaveAttribute('href', '/founder-tools?step=1');
  await cont.click();
  await expect(page).toHaveURL(/\/founder-tools\?step=1/);
  await expect(page.getByRole('heading', { name: 'Ορισμός προβλήματος' }).first()).toBeVisible();
});

test('module 1 status agrees between founder tools and workspace builder', async ({ page }) => {
  await demoEl(page);
  await page.goto('/founder-tools');
  await page.waitForTimeout(1500);
  const toolStatus = await page.locator('div.group:has(h4:text-is("Ορισμός προβλήματος")) span.rounded-full').first().innerText();

  await page.goto('/workspace');
  await page.waitForTimeout(1200);
  await page.getByRole('tab', { name: 'Δημιουργός' }).click();
  const wsStatus = await page.locator('div:has(> a[href="/founder-tools?step=1"]) > span.rounded-full').innerText();
  expect(wsStatus).toBe(toolStatus);
  expect(toolStatus).toBe('Ολοκληρώθηκε');
});

test('edit round saves and the assistant reads the same runway', async ({ page }) => {
  await demoEl(page);
  await page.goto('/fundraising');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Επεξεργασία γύρου' }).click();
  await page.locator('label:has(span:text-is("Μηνιαίο burn ($)")) input').fill('10000');
  await page.getByRole('button', { name: 'Αποθήκευση' }).click();
  await page.waitForTimeout(500);
  const kpi = (label: string) => page.locator(`div:has(> p:text-is("${label}")) > p`).nth(1).innerText();
  expect(await kpi('Ρυθμός καύσης')).toBe('$10k/mo');
  expect(await kpi('Υπόλοιπο περιθώριο')).toBe('18mo');

  await page.getByRole('button', { name: 'Άνοιγμα βοηθού' }).click();
  await page.locator('input[placeholder*="πληκτρολόγησε"]').fill('/round');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/18 μήνες/).first()).toBeVisible({ timeout: 10000 });
});

test('on-this-page chips appear on network, events and notifications', async ({ page }) => {
  await demoEl(page);
  for (const route of ['/network', '/events', '/notifications']) {
    await page.goto(route);
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Άνοιγμα βοηθού' }).click();
    const rail = page.locator('div:has(> span:text-is("Σε αυτή τη σελίδα:"))');
    await expect(rail).toBeVisible();
    expect(await rail.locator('button').count(), `${route} should offer at least 2 page controls`).toBeGreaterThanOrEqual(2);
    await page.getByRole('button', { name: 'Κλείσιμο' }).click();
  }
});
