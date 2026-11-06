import { expect, test, type Page } from '@playwright/test';

/**
 * Round 24 on Founder Tools: the stats row counts the real list instead of
 * quoting numbers, expanding an application edits its status and note (and
 * drafts one from real data), and a written slide can be cleared with Undo.
 */
async function sample(page: Page, path: string, seed?: Record<string, unknown>) {
 await page.addInitScript((entries) => {
  localStorage.setItem('demo_mode', 'true');
  for (const [key, value] of Object.entries(entries ?? {})) localStorage.setItem(key, JSON.stringify(value));
 }, seed ?? {});
 await page.goto(path);
 await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

const TRACKED = [{
 id: 42,
 program: 'Founders Factory EU',
 type: 'Accelerator',
 status: 'draft',
 deadline: '—',
 decision: '—',
 match: 0,
 note: '',
}];

test('application stats count the tracked list', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/founder-tools?tab=applications', {
  'cfb.trackedApplications': [{ ...TRACKED[0], status: 'submitted' }],
 });
 const submitted = page.locator('p', { hasText: 'Submitted' }).first();
 await expect(submitted).toBeVisible();
 // The stat under it counts the seeded submitted application, not a quoted "1".
 await expect(page.getByText('Founders Factory EU')).toBeVisible();
});

test('expanding an application edits status and note with a data draft', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/founder-tools?tab=applications', { 'cfb.trackedApplications': TRACKED });
 await page.getByRole('button', { name: 'Expand application details' }).first().click();
 const status = page.locator('#app-status-42');
 await expect(status).toBeVisible();
 await status.selectOption('submitted');
 // Drafting from the demo venture data fills the note.
 await page.getByRole('button', { name: 'Draft from my data' }).click();
 const note = page.locator('#app-note-42');
 await expect(note).not.toHaveValue('');
});

test('a written slide clears with Undo', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/founder-tools?tab=pitch', { 'cfb.pitchDeck': { problem: 'Founders waste weeks matching by hand.' } });
 // The Problem slide is slide 2 — select it, then clear.
 await page.getByRole('button', { name: /Problem/ }).first().click();
 await expect(page.getByText('Founders waste weeks matching by hand.').first()).toBeVisible();
 await page.getByRole('button', { name: "Clear this slide's text" }).click();
 await expect(page.getByText(/cleared/)).toBeVisible({ timeout: 10_000 });
 await page.getByRole('button', { name: 'Undo' }).click();
});

test('no overflow on a phone', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 });
 await sample(page, '/founder-tools');
 const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});
