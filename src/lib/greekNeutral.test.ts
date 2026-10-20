import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Slashed gendered forms (Ο/Η, τον/την, έτοιμος/η, Εγγεγραμμένος/-η) must not
// appear anywhere in source copy — every name-bearing phrase uses a neutral
// construction instead.
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const GENDERED = /Ο\/Η|ο\/η |τον\/την|του\/της|ος\/-?η\b/;
const SKIP = new Set(['greekNeutral.test.ts']);

function* walk(dir: string): Generator<string> {
 for (const entry of readdirSync(dir, { withFileTypes: true })) {
  const path = join(dir, entry.name);
  if (entry.isDirectory()) yield* walk(path);
  else if (/\.(ts|tsx)$/.test(entry.name) && !SKIP.has(entry.name)) yield path;
 }
}

describe('Greek copy stays gender-neutral', () => {
 it('no slashed gendered forms in src', () => {
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
   readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (GENDERED.test(line)) offenders.push(`${file}:${i + 1} ${line.trim().slice(0, 100)}`);
   });
  }
  expect(offenders).toEqual([]);
 });
});
