#!/usr/bin/env node
/**
 * Normalises Tailwind colour classes to five hue families.
 *
 * The UI used twelve hue families for four meanings. The theme stylesheet
 * (src/index.css) already re-colours most of them to the same few values per
 * theme, so rose looked like red and teal like emerald — but the source said
 * otherwise, and each new screen picked a family at random. After this:
 *
 *   red      danger      (rose, pink)
 *   amber    warning     (orange, yellow)
 *   emerald  success     (green, teal, lime)
 *   blue     information (sky, cyan, indigo)
 *   violet   AI / special (purple, fuchsia)
 *
 * Shades are kept. Theme swatches (Layout's PALETTES, which preview each
 * theme's own colour) are left alone. Run: node scripts/codemods/normalize-hues.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const MAP = { rose: 'red', pink: 'red', orange: 'amber', yellow: 'amber', green: 'emerald', teal: 'emerald', lime: 'emerald', sky: 'blue', cyan: 'blue', indigo: 'blue', purple: 'violet', fuchsia: 'violet' };
const UTIL = '(?:text|bg|border|ring|fill|stroke|from|to|via|shadow|outline|decoration|divide|placeholder|accent|caret)';
const PATTERN = new RegExp(`(?<![\\w-])(${UTIL}(?:-[trblxy])?)-(${Object.keys(MAP).join('|')})-(\\d{2,3})(?![\\w-])`, 'g');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

let changed = 0;
let replacements = 0;
for (const file of walk('src')) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let touched = false;
  const next = lines.map((line) => {
    // Theme swatches preview the theme's own colour: keep them.
    if (/\bdot:\s*'bg-/.test(line)) return line;
    return line.replace(PATTERN, (_all, util, hue, shade) => {
      touched = true;
      replacements += 1;
      return `${util}-${MAP[hue]}-${shade}`;
    });
  });
  if (touched) {
    fs.writeFileSync(file, next.join('\n'));
    changed += 1;
  }
}
console.log(`normalize-hues: ${replacements} classes in ${changed} files`);
