// Visual sweep: screenshots of every protected route in demo mode at two widths,
// plus console errors and horizontal-overflow detection. Writes to .probes/sweep/.
// In `el` runs it also collects Latin-only UI text (no Greek) into english-leak.json.
// Usage: node scripts/visual-sweep.mjs [baseUrl] [lang]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:3010';
const lang = process.argv[3] || 'el';
const routes = [
  '/dashboard', '/discovery', '/matches', '/network', '/messages', '/mentors', '/events', '/communities',
  '/programs', '/fundraising', '/perks', '/resources', '/legal', '/milestones', '/workspace', '/calendar',
  '/insights', '/notifications', '/profile', '/settings', '/settings/billing', '/founder-tools', '/quiz',
  '/pricing', '/admin', '/admin/users', '/admin/automation', '/admin/branding', '/admin/sso',
  '/admin/taxonomy', '/admin/domains', '/admin/billing', '/admin/billing-oversight',
];
const widths = [1440, 390];
const out = '.probes/sweep';
mkdirSync(out, { recursive: true });

const ALLOW_TERMS = [
  'SaaS', 'FinTech', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'MVP', 'Pitch', 'Data room',
  'AI', 'API', '.ics', 'Demo', 'CoFounderBay', 'Google Meet', 'Zoom', 'EUR', 'USD', 'B2B', 'B2C',
  'OpenID Connect', 'OAuth', 'SAML', 'OIDC', 'ACS', 'TXT', 'SSO', 'URL', 'CSV', 'PDF', 'OK', 'UI/UX',
];
const ALLOW_NAMES = [
  'Sarah Chen', 'Alex Rivera', 'Marcus Thorne', 'Elena Rodriguez', 'David Park', 'Emma Kim',
  'Jordan Taylor', 'Priya Sharma', 'Mia Kovacs', 'James Wilson', 'Leila Hassan', 'David Hoffman',
  'Elena Rossi', 'Samir Patel', 'Jessica Wu', 'Daniel Weiss',
  'Naval Ravikant', 'Aaron Ross', 'Marc Andreessen',
  'Amazon Web Services', 'AWS', 'Stripe', 'HubSpot', 'Notion', 'Google Cloud', 'GCP', 'Intercom',
  'Slack', 'Mercury', 'Finly Ventures', 'Finly', 'Green Earth Foundation', 'Founders Academy',
  'EcoFlow Systems', 'Healthify', 'StartupLaw LLP', 'PixelPerfect', 'DevOps Pros',
  'Tech Hub', 'Innovation Center', 'London', 'NY', 'NYC', 'SF',
];
const leakFilterSource = `
  (function () {
    const GREEK = /[\\u0370-\\u03ff\\u1f00-\\u1fff]/;
    const LATIN = /[A-Za-z]/;
    const raw = [];
    const push = (s, kind) => { if (s) raw.push({ s: String(s).trim(), kind }); };
    document.querySelectorAll('body *').forEach((el) => {
      if (el.closest('script,style,noscript')) return;
      push(el.getAttribute('placeholder'), 'placeholder');
      push(el.getAttribute('aria-label'), 'aria-label');
      push(el.getAttribute('title'), 'title');
      for (const node of el.childNodes) {
        if (node.nodeType === 3 && node.textContent.trim()) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) push(node.textContent, 'text');
        }
      }
    });
    return raw;
  })()
`;

const allow = [...ALLOW_TERMS, ...ALLOW_NAMES];
function isLeak(s) {
  if (!s || s.length < 3) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  if (/[΀-῿]/.test(s)) return false;
  let t = s
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, ' ')
    .replace(/[\d$€£%+.,:/#@_-]+/g, ' ');
  for (const term of allow) {
    t = t.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  // Drop residual one/two-letter words (e.g. "Q3", "of").
  t = t.replace(/\b[A-Za-z]{1,2}\b/g, ' ');
  return /[A-Za-z]{3,}/.test(t);
}

const browser = await chromium.launch();
const rows = [];
const leaks = {};
const newCtx = async (width) => {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: lang === 'el' ? 'el-GR' : 'en-GB' });
  await ctx.addInitScript((l) => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('cfb.lang', l);
    localStorage.setItem('lang', l);
  }, lang);
  return ctx;
};
const withTimeout = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
]);
for (const width of widths) {
  let ctx = await newCtx(width);
  for (const route of routes) {
    const page = await ctx.newPage();
    const errors = [];
    // [firebase] firestore cache repair info lines are ignorable only when they
    // do not accompany an SDK internal assertion — hold them, promote to errors
    // if an assertion was recorded on the same route.
    const repairs = [];
    const record = (text) => {
      if (/firestore cache repair/i.test(text)) { repairs.push(text); return; }
      if (errors.length < 30) errors.push(text);
    };
    page.on('pageerror', (e) => record(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') record(`console: ${m.text().slice(0, 200)}`); });
    let row;
    let recycle = false;
    try {
      await withTimeout((async () => {
        await page.goto(base + route, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(1800);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        const h1 = await page.evaluate(() => (document.querySelector('h1')?.textContent || '').trim().slice(0, 60));
        const file = `${out}/${width}${route.replace(/\//g, '_')}.png`;
        await page.screenshot({ path: file, fullPage: true });
        const asserted = errors.some((e) => /INTERNAL ASSERTION/i.test(e));
        row = { width, route, h1, overflow, height, errors: [...new Set([...errors, ...(asserted ? repairs : [])])] };
        if (lang === 'el' && width === widths[0]) {
          const raw = await page.evaluate(leakFilterSource);
          const hits = [...new Set(raw.filter((r) => isLeak(r.s)).map((r) => `${r.kind}: ${r.s.trim()}`))];
          if (hits.length) leaks[route] = [...(leaks[route] ?? []), ...hits.filter((h) => !(leaks[route] ?? []).includes(h))];
        }
      })(), 60000, route);
    } catch (e) {
      row = { width, route, error: String(e.message).slice(0, 160) };
      recycle = true;
    }
    rows.push(row);
    console.log(`${row.width}\t${row.route}\t${row.error ? 'ERROR ' + row.error : `h1="${row.h1}" overflow=${row.overflow} height=${row.height} errors=${row.errors.length}`}`);
    for (const e of row.errors || []) console.log(`\t\t${e}`);
    if (recycle) {
      await ctx.close().catch(() => undefined);
      ctx = await newCtx(width);
    } else {
      await page.close().catch(() => undefined);
    }
  }
  await ctx.close().catch(() => undefined);
}
await browser.close();
writeFileSync(`${out}/summary.json`, JSON.stringify(rows, null, 2));
if (lang === 'el') {
  writeFileSync(`${out}/english-leak.json`, JSON.stringify(leaks, null, 2));
  for (const [route, hits] of Object.entries(leaks)) console.log(`leak\t${route}\t${hits.length}`);
}
