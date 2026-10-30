import { test, expect } from '@playwright/test';

/**
 * Smoke suite — verifies the critical public surface renders end-to-end:
 * routing, document titles (RouteLifecycle), the 404 page, and the offline
 * indicator. These tests require no authentication and no seeded data.
 */

test.describe('public routes', () => {
  test('landing page renders with the correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CoFounderBay — Find Your Co-Founder/);
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('login page renders with the correct title', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Sign In · CoFounderBay/);
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('pricing page renders without crashing', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/Pricing · CoFounderBay/);
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});

test.describe('404 handling', () => {
  test('unknown route shows the professional 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveTitle(/Page Not Found · CoFounderBay/);
    await expect(page.getByText('Error 404')).toBeVisible();
    await expect(page.getByText('This page does not exist')).toBeVisible();
  });

  test('404 page recovers to home', async ({ page }) => {
    // A first visit opens the sample account (whose 404 offers its Dashboard); this checks a signed-out guest.
    await page.addInitScript(() => localStorage.setItem('demo_mode', 'false'));
    await page.goto('/this-route-does-not-exist');
    await page.getByRole('link', { name: /Home/i }).click();
    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle(/CoFounderBay — Find Your Co-Founder/);
  });
});

test.describe('offline indicator', () => {
  test('shows the offline pill when connectivity drops', async ({ page, context }) => {
    await page.goto('/');
    // Wait for the lazy page chunk to render before cutting the network —
    // `goto` resolves at `load` while the lazy LandingPage import can still be
    // in flight, so going offline immediately raced the chunk request.
    await expect(page).toHaveTitle(/CoFounderBay — Find Your Co-Founder/);
    await expect(page.locator('#root')).not.toBeEmpty();
    await context.setOffline(true);
    await expect(page.getByText(/You are offline/i)).toBeVisible();
    // Restore connectivity — the offline warning must clear. (The transient
    // "Back online" toast auto-hides after 3s, so asserting its absence-of-the
    // -warning is the deterministic check.)
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByText(/You are offline/i)).toBeHidden();
  });
});
