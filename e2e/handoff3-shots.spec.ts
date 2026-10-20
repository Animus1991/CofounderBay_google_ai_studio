import { test } from '@playwright/test';

/**
 * Handoff 3 evidence screenshots:
 * /profile at 1440 after the width fix, /pricing signed out, /dashboard in EL.
 */

test('profile width + pricing guest + dashboard el shots', async ({ page }) => {
  // demo + EL for profile/dashboard
  await page.addInitScript(() => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cfb.lang', 'el');
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/profile');
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.probes/sweep/1440_profile_width.png', fullPage: false });

  await page.goto('/dashboard');
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.probes/sweep/1440_dashboard_el.png', fullPage: false });

  // signed-out pricing (clear demo)
  const page2 = await page.context().browser()?.newPage();
  if (page2) {
    await page2.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('cfb.lang', 'el');
    });
    await page2.setViewportSize({ width: 1440, height: 900 });
    await page2.goto('/pricing');
    await page2.waitForTimeout(800);
    await page2.screenshot({ path: '.probes/sweep/1440_pricing_guest.png', fullPage: false });
    await page2.close();
  }
});
