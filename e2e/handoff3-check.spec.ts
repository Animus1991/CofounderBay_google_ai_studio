import { test, expect } from '@playwright/test';

/**
 * Handoff 3 spot checks — demo mode, Greek UI:
 * B1 notification feed (badge parity, mark-read, delete persistence),
 * C4 localized cast headline/bio on the profile page,
 * C3/C4 Greek copy on the dashboard and mentors grid.
 */

const demoEl = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cfb.lang', 'el');
  });
};

test('notification feed: sidebar badge matches the unread tab and survives a reload', async ({ page }) => {
  await demoEl(page);
  await page.goto('/notifications');
  const unreadTab = page.getByRole('button', { name: /Αδιάβαστες/ });
  await expect(unreadTab).toBeVisible();
  const tabText = await unreadTab.textContent();
  const unreadCount = Number((tabText || '').replace(/\D/g, ''));
  const badge = page.locator('aside').getByText(String(unreadCount), { exact: true }).first();
  await expect(badge).toBeVisible();

  // deleting a note removes it now and after a reload
  const firstTitle = await page.locator('main h4, main button').filter({ hasText: /Νέα πρόταση αντιστοίχισης/ }).first().textContent();
  await page.getByRole('button', { name: 'Διαγραφή' }).first().click();
  await page.reload();
  await expect(page.getByText(firstTitle || '')).toHaveCount(0);

  // mark all read clears the badge
  await page.getByRole('button', { name: /Σήμανση όλων/ }).click();
  const unreadAfter = page.getByRole('button', { name: /Αδιάβαστες/ });
  await expect(unreadAfter).toContainText('0');
});

test('cast profile renders Greek headline and bio in EL mode', async ({ page }) => {
  await demoEl(page);
  await page.goto('/profile/sarah-chen');
  await expect(page.getByText('φτιάχνει εργαλεία ταμειακών ροών').first()).toBeVisible();
  await expect(page.getByText('Πρώην product lead σε εταιρεία πληρωμών').first()).toBeVisible();
});

test('dashboard and mentors render the Greek demo copy in EL mode', async ({ page }) => {
  await demoEl(page);
  await page.goto('/dashboard');
  await expect(page.getByText('έφτασε σκορ αντιστοίχισης 98').first()).toBeVisible();
  await expect(page.getByText('Αυτή την εβδομάδα · σχέδιο δράσης').first()).toBeVisible();
  // The match explainer link now names the person: «Γιατί Sarah; Δες την ανάλυση σκορ».
  await expect(page.getByText(/Γιατί .+; Δες την ανάλυση σκορ/).first()).toBeVisible();

  await page.goto('/mentors');
  await expect(page.getByText('Πρώην VP Product στην Uber').first()).toBeVisible();
  await expect(page.getByText('Κορυφαίος μέντορας')).toHaveCount(0);
});
