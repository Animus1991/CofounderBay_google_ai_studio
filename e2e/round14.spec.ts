import { expect, test, type Page } from '@playwright/test';

async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await expect(page.locator('#root')).not.toBeEmpty();
}

async function ask(page: Page, text: string) {
  const input = page.getByLabel(/Message the assistant|Μήνυμα στον βοηθό/);
  await input.fill(text);
  await input.press('Enter');
}

test('the assistant reads the same unread inbox as the badge', async ({ page }) => {
  await sample(page, '/assistant');
  await ask(page, 'Which messages are unread?');
  await expect(page.getByText(/3 unread — same count as the Messages badge/)).toBeVisible();
  await expect(page.getByText(/Alex Rivera · 2 unread/)).toBeVisible();
  await expect(page.getByText(/Jordan Taylor · 1 unread/)).toBeVisible();
});

test('an assistant message appears in the real Messages thread', async ({ page }) => {
  await sample(page, '/assistant');
  await ask(page, '/msg Sarah Chen: Let us review the term sheet tomorrow');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.getByRole('button', { name: 'Open chat with Sarah Chen' }).click();
  await expect(page.getByText('Let us review the term sheet tomorrow', { exact: true })).toBeVisible();
});

test('a text deep link prefills the composer and sends nothing', async ({ page }) => {
  await sample(page, '/messages?user=sarah-chen&text=Hello%20there');
  const composer = page.getByPlaceholder(/Write a message|Γράψε μήνυμα/);
  await expect(composer).toHaveValue('Hello there');
  await expect(page.locator('[data-message-id]', { hasText: 'Hello there' })).toHaveCount(0);
});
