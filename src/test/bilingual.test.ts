/**
 * Every sentence the interface shows has a Greek version.
 *
 * Copy is written inline as t('English', 'Ελληνικά'), which keeps the two
 * languages side by side. The failure mode is a pair whose Greek half is just
 * the English again. Short labels (brand names, "Email", "SaaS") are allowed;
 * three or more English words with no Greek in the second half are not.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PAIR = /\bt\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1\s*,\s*(['"`])((?:(?!\3)[^\\]|\\.)*)\3\s*\)/g;

function sources(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, files);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(full);
  }
  return files;
}

describe('bilingual copy', () => {
  it('has Greek wherever a sentence has English', () => {
    const missing: string[] = [];
    for (const file of sources(path.resolve(__dirname, '..'))) {
      for (const match of fs.readFileSync(file, 'utf8').matchAll(PAIR)) {
        const en = match[2] ?? '';
        const el = match[4] ?? '';
        const words = en.split(/\s+/).filter((word) => /[a-z]{3,}/i.test(word)).length;
        if (words >= 3 && !/[α-ωάέήίόύώϊϋΐΰ]/i.test(el)) missing.push(`${path.relative(process.cwd(), file)}: ${en.slice(0, 60)}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
