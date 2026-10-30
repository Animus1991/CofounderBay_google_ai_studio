/**
 * The palette guard.
 *
 * Status colours come from five hue families, one meaning each:
 * red = danger, amber = warning, emerald = success, blue = information,
 * violet = AI / special. The theme stylesheet tunes exactly these per theme
 * (src/styles/tokens.css); a class from another family (rose, teal, sky, purple…)
 * bypasses that tuning and drifts on dark and coloured themes. The only
 * exception is the theme picker's swatches, which show each theme's own colour.
 *
 * Fix a failure with `node scripts/codemods/normalize-hues.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const OFF_FAMILY = /(?<![\w-])(?:text|bg|border|ring|fill|stroke|from|to|via|shadow|outline|decoration|divide|placeholder|accent|caret)(?:-[trblxy])?-(?:rose|pink|orange|yellow|green|teal|lime|sky|cyan|indigo|purple|fuchsia)-\d{2,3}(?![\w-])/;

function sources(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, files);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(full);
  }
  return files;
}

describe('palette', () => {
  it('uses only the five status hue families outside the theme swatches', () => {
    const offenders: string[] = [];
    for (const file of sources(path.resolve(__dirname, '..'))) {
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
        if (/\bdot:\s*'bg-/.test(line)) return;
        const hit = OFF_FAMILY.exec(line);
        if (hit) offenders.push(`${path.relative(process.cwd(), file)}:${index + 1} ${hit[0]}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
