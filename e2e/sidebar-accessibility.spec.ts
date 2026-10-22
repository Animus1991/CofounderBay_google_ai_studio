import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cfb.lang', 'en');
  });
});

test('closed mobile navigation is skipped by Tab and Settings closes the drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  const drawer = page.locator('aside[aria-hidden]');
  await expect(drawer).toHaveAttribute('inert', '');
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(false);
  }
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(drawer).not.toHaveAttribute('inert', '');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(drawer).toHaveAttribute('inert', '');
});

test('desktop collapse control works with Enter and retains profile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');
  const collapse = page.getByRole('button', { name: 'Collapse sidebar', exact: true });
  await collapse.focus();
  await page.keyboard.press('Enter');
  const expand = page.getByRole('button', { name: 'Expand sidebar', exact: true });
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expand.focus();
  await page.keyboard.press('Enter');
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('link', { name: 'Open your profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
});

test('desktop navigation is restored after resizing from a closed mobile drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  const drawer = page.locator('aside[aria-hidden]');
  await expect(drawer).toHaveAttribute('inert', '');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(drawer).not.toHaveAttribute('inert', '');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
});
