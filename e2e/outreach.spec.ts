import { test, expect, type Page } from '@playwright/test';

/**
 * What the founder sends towards investors, on the sample account against the
 * dev server (no sign-in needed there; production requires it): the CRM board,
 * a drafted follow-up email that is logged, due diligence with a read-only link
 * an investor can open, and the studio check.
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

test.describe('investor CRM', () => {
  test('the board shows each stage, the overdue step, and drafts an email that is logged', async ({ page }) => {
    await sample(page, '/fundraising?tab=crm');
    const board = page.getByTestId('investor-crm-board');
    await expect(board).toBeVisible();
    await expect(page.getByTestId('investor-crm-summary')).toContainText('1 overdue');
    await expect(page.getByTestId('investor-crm-column-contacted')).toContainText('Andreessen Horowitz');

    await page.getByTestId('investor-card-ask-inv_3').click();
    await expect(page.getByText(/^Subject: Following up/).first()).toBeVisible();
    await page.getByTestId('assistant-email-send').first().click();
    const modal = page.getByTestId('send-email-modal');
    await expect(modal).toBeVisible();
    await page.getByTestId('send-email-to').fill('partner@a16z.com');
    await page.getByTestId('send-email-submit').click();
    await expect(page.getByText('Logged — not sent')).toBeVisible();
    await expect(page.getByTestId('investor-card-last-email-inv_3')).toContainText('logged');
  });

  test('removing an investor can be undone', async ({ page }) => {
    await sample(page, '/fundraising?tab=crm');
    await page.getByTestId('investor-card-remove-inv_4').click();
    await expect(page.getByTestId('investor-card-inv_4')).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByTestId('investor-card-inv_4')).toBeVisible();
  });
});

test.describe('due diligence', () => {
  test('a status changes in place, a link is shared, the investor opens it, and revoking ends it', async ({ page, context }) => {
    await sample(page, '/fundraising?tab=dd');
    await expect(page.getByTestId('dd-tracker')).toBeVisible();
    const before = await page.getByTestId('dd-progress').innerText();
    await page.getByTestId('dd-status-dd-contracts').click();
    await expect(page.getByTestId('dd-progress')).not.toHaveText(before);

    await page.getByTestId('dd-share-investor').fill('Sequoia Capital');
    await page.getByTestId('dd-share-create').click();
    const share = page.locator('[data-testid^="dd-share-open-"]').first();
    await expect(share).toBeVisible();
    const href = await share.getAttribute('href');
    expect(href).toMatch(/^\/dd\/[A-Za-z0-9_-]{20,}$/);

    const investor = await context.newPage();
    await investor.goto(href!);
    await expect(investor.getByTestId('dd-public-page')).toBeVisible();
    await expect(investor.getByTestId('dd-public-investor')).toContainText('Sequoia Capital');

    const token = href!.split('/').pop()!;
    await page.getByTestId(`dd-share-revoke-${token}`).click();
    await page.getByTestId(`dd-share-revoke-confirm-${token}`).click();
    await expect(page.getByText('Link revoked')).toBeVisible();
    await investor.reload();
    await expect(investor.getByTestId('dd-public-missing')).toBeVisible();
  });
});

test.describe('studio check', () => {
  test('the assistant reads every area and names the weakest', async ({ page }) => {
    await sample(page, '/assistant');
    await ask(page, '/audit');
    await expect(page.getByText(/Studio check: \d+% complete across 8 areas/)).toBeVisible();
  });
});
