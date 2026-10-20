// Visual sweep: screenshots of every protected route in demo mode at two widths,
// plus console errors and horizontal-overflow detection. Writes to .probes/sweep/.
// Usage: node scripts/visual-sweep.mjs [baseUrl] [lang]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:3010';
const lang = process.argv[3] || 'el';
const routes = [
  '/dashboard', '/discovery', '/matches', '/network', '/messages', '/mentors', '/events', '/communities',
  '/programs', '/fundraising', '/perks', '/resources', '/legal', '/milestones', '/workspace', '/calendar',
  '/insights', '/notifications', '/profile', '/settings', '/founder-tools', '/quiz', '/pricing', '/admin',
];
const widths = [1440, 390];
const out = '.probes/sweep';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const rows = [];
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: lang === 'el' ? 'el-GR' : 'en-GB' });
  await ctx.addInitScript((l) => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cfb.lang', l);
    localStorage.setItem('lang', l);
  }, lang);
  const page = await ctx.newPage();
  for (const route of routes) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`); });
    try {
      await page.goto(base + route, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1800);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const h1 = await page.evaluate(() => (document.querySelector('h1')?.textContent || '').trim().slice(0, 60));
      const file = `${out}/${width}${route.replace(/\//g, '_')}.png`;
      await page.screenshot({ path: file, fullPage: true });
      rows.push({ width, route, h1, overflow, height, errors: [...new Set(errors)] });
    } catch (e) {
      rows.push({ width, route, error: String(e.message).slice(0, 160) });
    }
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${out}/summary.json`, JSON.stringify(rows, null, 2));
for (const r of rows) {
  console.log(`${r.width}\t${r.route}\t${r.error ? 'ERROR ' + r.error : `h1="${r.h1}" overflow=${r.overflow} height=${r.height} errors=${r.errors.length}`}`);
  for (const e of r.errors || []) console.log(`\t\t${e}`);
}
