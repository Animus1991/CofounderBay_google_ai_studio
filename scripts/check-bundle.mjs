#!/usr/bin/env node
/**
 * Bundle budget: fails the build when the code every visitor downloads first
 * grows past the budget. Run after `vite build` (CI does).
 *
 * - entry: the main chunk (index-*.js) — 1,531 KB before route splitting,
 *   683 KB after round 2, 747 KB once the other agent's tools were merged, and
 *   ~488 KB since the assistant panel, the operator and the daily step load as
 *   their own chunks. The budget leaves room for normal growth, not for
 *   importing the assistant (or a page) statically into the app frame again.
 * - any single chunk: no lazy page or vendor chunk over the chunk budget.
 */
import fs from 'node:fs';
import path from 'node:path';

const BUDGET = { entryKb: 560, chunkKb: 1100 };
const dir = path.resolve('dist/assets');
if (!fs.existsSync(dir)) {
  console.error('check-bundle: dist/assets not found — run `npm run build` first.');
  process.exit(1);
}
const files = fs.readdirSync(dir).filter((name) => name.endsWith('.js'));
const kb = (name) => fs.statSync(path.join(dir, name)).size / 1024;
const entry = files.filter((name) => /^index-.*\.js$/.test(name));
const problems = [];
for (const name of entry) if (kb(name) > BUDGET.entryKb) problems.push(`${name}: ${kb(name).toFixed(0)} KB > entry budget ${BUDGET.entryKb} KB`);
for (const name of files) if (kb(name) > BUDGET.chunkKb) problems.push(`${name}: ${kb(name).toFixed(0)} KB > chunk budget ${BUDGET.chunkKb} KB`);
const largest = [...files].sort((a, b) => kb(b) - kb(a)).slice(0, 5).map((name) => `${name} ${kb(name).toFixed(0)} KB`);
console.log(`check-bundle: entry ${entry.map((name) => `${kb(name).toFixed(0)} KB`).join(', ')} (budget ${BUDGET.entryKb}); largest: ${largest.join(' · ')}`);
if (problems.length) {
  console.error(`check-bundle: over budget\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
