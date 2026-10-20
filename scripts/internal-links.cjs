#!/usr/bin/env node
/**
 * Internal-link audit: every static `to="/..."`, `href="/..."`,
 * `navigate('/...')` and `href: '/...'` literal in src/ must resolve to a
 * route declared in src/App.tsx. Dynamic segments (`:id`) match any single
 * segment. Catches dead routes like a `/communities/:id` with no page.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const appSource = fs.readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
const routePaths = new Set();
for (const m of appSource.matchAll(/path="([^"]+)"/g)) routePaths.add(m[1]);
for (const m of appSource.matchAll(/to="([^"]+)"/g)) routePaths.add(m[1]);

const matchers = [...routePaths].map((p) => {
  const pattern = p
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\:[^/]+/g, '[^/]+')
    .replace(/:[^/]+/g, '[^/]+');
  return new RegExp(`^${pattern}$`);
});
matchers.push(/^\*$/, /^\/$/);

function isKnown(href) {
  const clean = href.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return matchers.some((re) => re.test(clean));
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) yield full;
  }
}

const LINK_RE = /(?:to|href)=\{?"'(\/[^"'{}<>` ]*)"'?\}?|navigate\(\s*['"`](\/[^'"`]*)['"`]|href:\s*['"`](\/[^'"`]*)['"`]|detail:\s*\{\s*href:\s*['"`](\/[^'"`]*)['"`]/g;

let checked = 0;
const misses = [];
for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(LINK_RE)) {
    const href = m[1] || m[2] || m[3] || m[4];
    if (!href || href.startsWith('//')) continue;
    checked++;
    if (!isKnown(href)) {
      const line = text.slice(0, m.index).split('\n').length;
      misses.push(`${rel}:${line} -> ${href}`);
    }
  }
}

console.log(`checked ${checked} internal links against ${routePaths.size} routes`);
if (misses.length) {
  console.log('\nUnresolved internal links:');
  misses.forEach((m) => console.log('  ' + m));
  process.exitCode = 1;
} else {
  console.log('All internal links resolve.');
}
