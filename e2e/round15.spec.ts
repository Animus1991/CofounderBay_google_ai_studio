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

test('Prepare my week lists the next seven days and offers a step to confirm', async ({ page }) => {
  await sample(page, '/assistant');
  await ask(page, 'Prepare my week');
  await expect(page.getByText(/The next 7 days/).first()).toBeVisible();
  await expect(page.getByText(/Investor follow-ups: 1 overdue/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Confirm', exact: true }).first().click();
  await ask(page, 'triage my notifications');
  // The message from Marcus and the overdue follow-up still wait on the founder.
  await expect(page.getByText('Every unread notification is waiting on you.').first()).toBeVisible();
});

test('a sample-account message is still in Messages after a reload', async ({ page }) => {
  await sample(page, '/assistant');
  await ask(page, '/msg Sarah Chen: Still here after the reload');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  // The sent card offers the thread once the message is in it.
  await expect(page.getByRole('button', { name: 'Open chat with Sarah Chen' })).toBeVisible();
  await page.goto('/messages?user=sarah-chen');
  await expect(page.getByText('Still here after the reload', { exact: true })).toBeVisible();
});

test('at 1280 the last dashboard card ends above the assistant button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await sample(page, '/dashboard');
  const lastRow = page.locator('#main-content').getByText('AI & Machine Learning');
  await expect(lastRow).toBeVisible();
  await page.evaluate(() => {
    const main = document.getElementById('main-content');
    if (main) main.scrollTop = main.scrollHeight;
  });
  const row = await lastRow.boundingBox();
  const launcher = await page.getByRole('button', { name: 'Open studio assistant' }).boundingBox();
  expect(row && launcher).toBeTruthy();
  expect(row!.y + row!.height).toBeLessThanOrEqual(launcher!.y - 8);
});

test('at 1280 the conversation details open as a drawer that Escape closes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await sample(page, '/messages?user=sarah-chen');
  const close = page.getByRole('button', { name: 'Close details' });
  await expect(close).toHaveCount(0);
  const toggle = page.getByRole('button', { name: 'Details', exact: true });
  await toggle.click();
  await expect(close).toBeVisible();
  // A dialog like every other: focus moves into it, Tab stays inside, Escape closes it.
  await expect(page.getByRole('dialog', { name: 'Details' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(close).toHaveCount(0);
  await expect(toggle).toBeFocused();
  // The composer keeps its width: the drawer covers the thread instead of squeezing it.
  const composer = await page.getByPlaceholder(/Write a message/).boundingBox();
  expect(composer!.width).toBeGreaterThan(300);
});

test('at 1440 the details sit beside the thread, open from the start', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await sample(page, '/messages?user=sarah-chen');
  await expect(page.getByRole('button', { name: 'Close details' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Close details' })).toBeVisible();
});

test('on a tablet the message box sits on the tab bar, nothing covers Send, and the details sheet closes from outside', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await sample(page, '/messages?user=sarah-chen');
  await expect(page.getByRole('button', { name: 'Open studio assistant' })).toBeHidden();
  const send = page.getByRole('button', { name: /^Send/ });
  await expect(send).toBeVisible();
  const box = (await send.boundingBox())!;
  const tabBarTop = await page.getByTestId('mobile-tab-bar').evaluate((el) => el.getBoundingClientRect().top);
  // No empty band between the message box and the tab bar.
  expect(tabBarTop - (box.y + box.height)).toBeLessThan(40);
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label') ?? '', { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  expect(hit).toMatch(/^Send/);
  // The assistant is still one tap away, from the header.
  await page.getByRole('button', { name: 'Open the AI Co-Pilot' }).click();
  await expect(page.getByRole('dialog', { name: 'Studio assistant' })).toBeVisible();
  await page.getByRole('button', { name: 'Minimize' }).click();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Details' })).toBeVisible();
  await page.mouse.click(40, 500);
  await expect(page.getByRole('dialog', { name: 'Details' })).toHaveCount(0);
});

test('on a phone a message shows its actions when tapped, not under every message', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page, '/messages?user=alex-rivera');
  const hint = page.getByText('Tap a message to reply, react, copy or forward it.');
  await expect(hint).toBeVisible();
  const replies = page.getByRole('button', { name: 'Reply', exact: true });
  await expect(replies.first()).toBeAttached();
  // Still reachable by screen readers and the keyboard, but not drawn under every message.
  const toolbarWidths = () => replies.evaluateAll((buttons) => buttons.map((button) => button.parentElement!.parentElement!.getBoundingClientRect().width));
  expect(Math.max(...await toolbarWidths())).toBeLessThanOrEqual(1);
  await page.getByText('Hey, are we still on for the pitch practice tomorrow?').click();
  await expect.poll(async () => Math.max(...await toolbarWidths())).toBeGreaterThan(100);
  expect((await toolbarWidths()).filter((width) => width > 1)).toHaveLength(1);
  await expect(hint).toHaveCount(0);
});

test('on a desktop there is no dictation button and the assistant button stays off the Messages composer', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await sample(page, '/messages?user=sarah-chen');
  await expect(page.getByRole('button', { name: 'Open studio assistant' })).toBeHidden();
  await expect(page.getByRole('button', { name: /^Send/ })).toBeVisible();
  await sample(page, '/assistant');
  await expect(page.getByRole('button', { name: 'Dictate the question' })).toHaveCount(0);
});
