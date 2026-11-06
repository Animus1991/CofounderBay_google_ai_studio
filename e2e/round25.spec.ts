import { expect, test, type Page } from '@playwright/test';

/**
 * Round 25, what the parity map still owed: a link to a comparison, a type
 * filter on the calendar, a priority filter on milestones, claimed perks, a CSV
 * of insights, Undo on "mark all read", one part of the data export, and
 * pricing answers that only say what the product does.
 */
async function sample(page: Page, path: string, seed?: Record<string, unknown>) {
 await page.addInitScript((entries) => {
  localStorage.setItem('demo_mode', 'true');
  for (const [key, value] of Object.entries(entries ?? {})) localStorage.setItem(key, JSON.stringify(value));
 }, seed ?? {});
 await page.goto(path);
 await page.locator('h1').first().waitFor({ timeout: 15_000 });
}

const soon = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

test('a comparison copies its own link', async ({ page, context }) => {
 await context.grantPermissions(['clipboard-read', 'clipboard-write']);
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/matches/compare');
 await page.getByRole('button', { name: 'Copy link' }).click();
 await expect(page.getByText('Link copied').first()).toBeVisible();
 const copied = await page.evaluate(() => navigator.clipboard.readText());
 expect(copied).toContain('/matches/compare?ids=');
});

test('the calendar filters by type', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/calendar', {
  'cfb.sessions': [
   { id: 'a', title: 'Board call', time: soon(1), type: 'Meeting' },
   { id: 'b', title: 'Grant deadline', time: soon(2), type: 'Deadline' },
  ],
 });
 await expect(page.getByText('Board call').first()).toBeVisible();
 await page.getByTestId('calendar-type-filter').selectOption('Deadline');
 await expect(page.getByText('Grant deadline').first()).toBeVisible();
 await expect(page.getByText('Board call')).toHaveCount(0);
});

test('milestones filter by priority', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/milestones');
 await page.getByText('Category filter').first().click();
 await page.getByRole('group', { name: 'Milestone priority' }).getByRole('button', { name: 'High' }).click();
 await expect(page.getByText(/milestones match your filters/)).toBeVisible();
});

test('claimed perks have their own view', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/perks', { 'cfb.claimedPerks': ['stripe'] });
 const claimed = page.getByRole('button', { name: 'Claimed (1)' });
 await expect(claimed).toBeVisible();
 await claimed.click();
 await expect(claimed).toHaveAttribute('aria-pressed', 'true');
 await expect(page.getByText('Mercury')).toHaveCount(0);
});

test('insights export what is on screen', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/insights');
 const download = page.waitForEvent('download');
 await page.getByTestId('insights-export').click();
 expect((await download).suggestedFilename()).toMatch(/^insights-.*\.csv$/);
});

test('mark all read can be undone', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/notifications');
 const button = page.getByTestId('notifications-mark-all-read');
 await expect(button).toBeEnabled();
 await button.click();
 await expect(button).toBeDisabled();
 await page.getByRole('button', { name: 'Undo' }).click();
 await expect(button).toBeEnabled();
});

test('one part of the data downloads alone', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/settings?tab=privacy');
 const groups = page.getByTestId('export-groups');
 await expect(groups).toBeVisible();
 const download = page.waitForEvent('download');
 await groups.getByRole('button', { name: 'Network' }).click();
 expect((await download).suggestedFilename()).toMatch(/^cofounderbay-network-.*\.json$/);
});

test('pricing answers questions and promises nothing unverified', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/pricing');
 await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();
 await expect(page.getByText('Can I pay today?')).toBeVisible();
 const body = await page.evaluate(() => document.body.innerText);
 expect(body).not.toMatch(/GDPR and CCPA|bank-grade|data residency/i);
});

test('a mentoring request shows under My requests', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/mentors', {
  'cfb.sessions': [{ id: 'r1', title: 'Mentoring · Dr. Sarah Kim', type: 'Mentorship', time: 'Next week', duration: '45m', location: 'Messages', participants: ['Dr. Sarah Kim'], priority: 'Medium', mentorRequest: true }],
 });
 const requests = page.getByTestId('mentor-requests');
 await expect(requests).toBeVisible();
 await expect(requests.getByText('Dr. Sarah Kim')).toBeVisible();
});

test('a course saves, completes and filters', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/resources');
 const first = page.getByRole('button', { name: 'Save', exact: true }).first();
 await first.click();
 await page.getByRole('button', { name: 'Mark done' }).first().click();
 await expect(page.getByRole('button', { name: 'Completed' }).first()).toBeVisible();
 const toggle = page.getByTestId('resources-saved-only');
 await expect(toggle).toContainText('(1)');
 await toggle.click();
 await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveCount(1);
 await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
});

test('a job saves and stays saved', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 900 });
 await sample(page, '/resources');
 await page.getByRole('button', { name: 'jobs' }).click();
 await page.getByRole('button', { name: /^Save / }).first().click();
 await page.reload();
 await page.locator('h1').first().waitFor();
 await expect(page.getByTestId('resources-saved-only')).toContainText('(1)');
});

for (const path of ['/calendar', '/perks', '/pricing', '/matches/compare', '/insights', '/mentors', '/resources']) {
 test(`${path} does not scroll sideways on a phone`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page, path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
 });
}
