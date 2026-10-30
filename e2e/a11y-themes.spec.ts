import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Colour contrast in every theme (src/styles/tokens.css): axe's contrast rule on
 * the screens with the most surfaces — the dashboard, the CRM board, due
 * diligence and settings. Fails on serious or critical violations.
 */

const THEMES = ['cyan', 'mint', 'apricot', 'lilac', 'burgundy', 'dark'] as const;
const ROUTES = ['/dashboard', '/fundraising?tab=crm', '/fundraising?tab=dd', '/settings'];

async function sample(page: Page, path: string, theme: string) {
  await page.addInitScript((palette) => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cofounderbay-ui', JSON.stringify({ state: { sidebarCollapsed: false, theme: 'light', paletteTheme: palette }, version: 0 }));
  }, theme);
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.waitForTimeout(600);
}

for (const theme of THEMES) {
  for (const route of ROUTES) {
    test(`readable contrast in ${theme} on ${route}`, async ({ page }) => {
      await sample(page, route, theme);
      const results = await new AxeBuilder({ page }).withRules(['color-contrast']).exclude('[data-toasts]').analyze();
      const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
      const summary = blocking.flatMap((violation) => violation.nodes.slice(0, 6).map((node) => `${node.target.join(' ')} — ${node.any[0]?.message ?? ''}`.slice(0, 260)));
      if (summary.length) console.warn(theme, route, `${blocking.reduce((n, v) => n + v.nodes.length, 0)} nodes\n  ${summary.join('\n  ')}`);
      expect(summary).toEqual([]);
    });
  }
}
