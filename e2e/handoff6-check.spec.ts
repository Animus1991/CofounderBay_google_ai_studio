import { test, expect } from '@playwright/test';

/**
 * Handoff 6 spot checks — demo mode, Greek UI:
 * A the assistant writes Settings through the same functions the page uses,
 * C demo profile edits persist + profile-set, D mark-all-read with undo.
 */

const demoEl = async (page: import('@playwright/test').Page, switches?: Record<string, unknown>) => {
  await page.addInitScript((seed) => {
    // Guarded: reloads keep what the demo persisted in this browser.
    if (localStorage.getItem('demo_mode') === 'true') return;
    localStorage.clear();
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cfb.lang', 'el');
    if (seed) localStorage.setItem('cfb.accountSwitches', JSON.stringify(seed));
  }, switches);
};

const ask = async (page: import('@playwright/test').Page, phrase: string) => {
  await page.getByRole('button', { name: 'Άνοιγμα βοηθού' }).click();
  await page.locator('input[placeholder*="πληκτρολόγησε"]').fill(phrase);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Επιβεβαίωση' })).toBeVisible({ timeout: 10000 });
};

// The in-bubble Undo (text-stone-500), not the auto-dismissing toast action.
const undoInChat = (page: import('@playwright/test').Page) => page.locator('button.text-stone-500', { hasText: 'Αναίρεση' });

test('settings-set: messagesFrom written via the shared applySwitches shows on Privacy without reload', async ({ page }) => {
  await demoEl(page, { messagesFrom: 'anyone' });
  await page.goto('/settings?tab=privacy');
  await page.waitForTimeout(1200);
  // Seeded to "anyone" so the change is observable.
  const anyone = page.getByRole('button', { name: /^Οποιοσδήποτε/ });
  await expect(anyone).toHaveClass(/bg-stone-900/);

  await ask(page, 'μηνύματα μόνο από συνδέσεις');
  await expect(page.getByText(/Μηνύματα από/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Επιβεβαίωση' }).click();
  await page.waitForTimeout(800);

  const connections = page.getByRole('button', { name: /^Συνδέσεις/ });
  await expect(connections).toHaveClass(/bg-stone-900/);
  await expect(anyone).not.toHaveClass(/bg-stone-900/);
});

test('settings-set: hide my email flips the switch and Undo restores it', async ({ page }) => {
  await demoEl(page, { showEmail: true });
  // The visibility switches (incl. showEmail) render on the Account tab.
  await page.goto('/settings');
  await page.waitForTimeout(1200);
  const toggle = page.getByRole('switch', { name: 'Εμφάνιση email' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  await ask(page, 'hide my email');
  await page.getByRole('button', { name: 'Επιβεβαίωση' }).click();
  await page.waitForTimeout(800);
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  await undoInChat(page).first().click();
  await page.waitForTimeout(800);
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
});

test('profile edits persist across a reload in demo mode', async ({ page }) => {
  await demoEl(page);
  await page.goto('/profile');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Επεξεργασία προφίλ' }).click();
  await page.locator('input[placeholder="Τίτλος"]').fill('Δοκιμή παραμονής');
  await page.getByRole('button', { name: 'Αποθήκευση αλλαγών' }).click();
  await expect(page.getByText('Δοκιμή παραμονής').first()).toBeVisible();

  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.getByText('Δοκιμή παραμονής').first()).toBeVisible();
});

test('profile-set: assistant headline lands on the profile, sidebar name untouched', async ({ page }) => {
  await demoEl(page);
  await page.goto('/profile');
  await page.waitForTimeout(1500);

  await ask(page, 'change my headline to Building Aegean');
  await page.getByRole('button', { name: 'Επιβεβαίωση' }).click();
  await page.waitForTimeout(800);

  await expect(page.getByText('Building Aegean').first()).toBeVisible();
  await expect(page.locator('p.text-xs.font-semibold.text-stone-900.truncate').first()).toHaveText('Demo User');
});

test('notifications-read: mark all read clears the badge, Undo brings it back', async ({ page }) => {
  await demoEl(page);
  await page.goto('/notifications');
  await page.waitForTimeout(1500);
  const badge = page.locator('a[href="/notifications"] span.tabular-nums');
  await expect(badge.first()).toBeVisible();

  await ask(page, 'mark all notifications read');
  await page.getByRole('button', { name: 'Επιβεβαίωση' }).click();
  await page.waitForTimeout(1000);
  await expect(badge).toHaveCount(0);

  await undoInChat(page).first().click();
  await page.waitForTimeout(1000);
  await expect(badge.first()).toBeVisible();
});
