import { test, expect, type Page } from '@playwright/test';

/**
 * The assistant as the founder uses it, on the sample account: several
 * changes in one message, investor follow-ups, "where is", and the overdue
 * signal on the dashboard. No model and no sign-in are needed — these paths
 * are the studio's own router, which is what makes them testable end to end.
 */

async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await expect(page.locator('#root')).not.toBeEmpty();
}

async function ask(page: Page, text: string) {
  const input = page.getByLabel('Message the assistant');
  await input.fill(text);
  await input.press('Enter');
}

test.describe('assistant', () => {
  test('confirms several changes from one message at once, and undoes them', async ({ page }) => {
    await sample(page, '/assistant');
    await ask(page, 'add milestone Private beta live and add task Call the bank');
    const confirmAll = page.getByRole('button', { name: 'Confirm all (2)' });
    await expect(confirmAll).toBeVisible();
    await confirmAll.click();
    await expect(page.getByText('2 changes made')).toBeVisible();
    await page.getByRole('button', { name: 'Undo all' }).click();
    await expect(page.getByText('Undone.').first()).toBeVisible();
  });

  test('reads follow-ups and sets a next step in Greek', async ({ page }) => {
    await sample(page, '/assistant');
    await ask(page, 'What follow-ups are due?');
    await expect(page.getByText(/Andreessen Horowitz: Follow up on the intro — overdue/)).toBeVisible();
    await ask(page, 'Επόμενο βήμα με τη Sequoia: στείλε τις προβλέψεις μέχρι την Παρασκευή');
    await page.getByRole('button', { name: 'Confirm', exact: true }).last().click();
    await page.goto('/fundraising?tab=tracker');
    await expect(page.getByText('στείλε τις προβλέψεις').last()).toBeVisible();
  });

  test('answers "where do I…" with the place and a link', async ({ page }) => {
    await sample(page, '/assistant');
    await ask(page, 'Where do I export my pitch deck?');
    await expect(page.getByText(/Founder Tools → Pitch/)).toBeVisible();
    await page.getByRole('button', { name: 'Take me there' }).click();
    await expect(page).toHaveURL(/\/founder-tools\?tab=pitch/);
  });
});

test.describe('follow-ups', () => {
  test('the dashboard says who is waiting', async ({ page }) => {
    await sample(page, '/dashboard');
    await expect(page.getByText(/Andreessen Horowitz is waiting/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Follow-ups due/ })).toBeVisible();
  });

  test('a next step is edited in place on the pipeline', async ({ page }) => {
    await sample(page, '/fundraising?tab=tracker');
    await expect(page.getByTestId('followup-summary')).toContainText('1 overdue');
    const edit = page.getByRole('button', { name: 'Edit the next step with Naval Ravikant' }).last();
    await edit.click();
    const step = page.getByTestId('followup-step-input').last();
    await step.fill('Send the revised cost model');
    await page.getByRole('button', { name: 'Save next step' }).last().click();
    await expect(page.getByText('Send the revised cost model').last()).toBeVisible();
  });
});

test.describe('onboarding', () => {
  test('a short description fills the form', async ({ page }) => {
    await sample(page, '/onboarding');
    await page.getByRole('button', { name: /^(Next|Continue)/ }).first().click();
    await page.getByLabel('Describe yourself').fill('Full-stack engineer with 6 years in payments, based in Athens. React and some B2B sales. Full-time on an MVP.');
    await page.getByRole('button', { name: 'Read it' }).click();
    await page.getByTestId('describe-apply').click();
    await expect(page.getByText(/Filled \d+ fields/)).toBeVisible();
    await expect(page.getByPlaceholder('City, Country')).toHaveValue('Athens, Greece');
  });
});
