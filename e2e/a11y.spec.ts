import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automatic accessibility check (axe-core, WCAG 2.1 A/AA rules) on the screens a
 * founder uses most, in the sample account. Fails on serious or critical
 * violations; moderate ones are printed so they can be worked down.
 */

const ROUTES = ['/dashboard', '/assistant', '/fundraising', '/fundraising?tab=crm', '/fundraising?tab=dd', '/matches', '/workspace', '/founder-tools?tab=pitch', '/founder-tools?tab=tools', '/insights', '/settings', '/notifications'];

async function sample(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('demo_mode', 'true'));
  await page.goto(path);
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
}

for (const route of ROUTES) {
  test(`no serious accessibility violations on ${route}`, async ({ page }) => {
    await sample(page, route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Toasts fade in (axe would measure contrast mid-animation); their close button has a name.
      .exclude('[data-toasts]')
      .analyze();
    const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    const summary = (list: typeof results.violations) => list.map((violation) => `${violation.impact} ${violation.id}: ${violation.nodes.length} × ${violation.nodes.slice(0, 2).map((node) => node.target.join(' ')).join(' | ')}`);
    if (results.violations.length) console.warn(route, '\n ', summary(results.violations).join('\n  '));
    expect(summary(blocking)).toEqual([]);
  });
}
