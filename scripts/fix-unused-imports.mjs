/**
 * Removes import specifiers that ESLint reports as unused.
 *
 * Reads eslint's flat output (paths + "LINE:COL warning 'NAME' is defined but
 * never used"), removes each named specifier only when the identifier appears
 * inside an import statement and nowhere else in the file — in-code dead vars
 * (unused state, params, consts) are left for manual review.
 *
 *   pnpm run lint > lint.txt 2>&1
 *   node scripts/fix-unused-imports.mjs lint.txt
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const report = readFileSync(process.argv[2], 'utf8');
const fileRe = /^([A-Z]:\\[^\r\n]+\.(?:tsx?|mjs?|jsx?))$/;
const warnRe = /warning\s+'([^']+)' is defined but never used/;

const byFile = new Map();
let current = null;
for (const raw of report.split(/\r?\n/)) {
  const line = raw.trim();
  const fileMatch = line.match(fileRe) ?? line.replace(/\\/g, '\\\\').match(fileRe);
  if (line.startsWith('C:\\') && /\.(tsx?|mjs?|jsx?)$/.test(line)) {
    current = line;
    continue;
  }
  if (fileMatch) { current = fileMatch[1]; continue; }
  const warn = line.match(warnRe);
  if (warn && current) {
    if (!byFile.has(current)) byFile.set(current, []);
    byFile.get(current).push(warn[1]);
  }
}

let removedCount = 0;
for (const [file, names] of byFile) {
  const src = readFileSync(file, 'utf8');
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const lines = src.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    if (!/^\s*import\s/.test(line) || /import\s+type\s*['"]/.test(line)) {
      out.push(line);
      continue;
    }
    const m = line.match(/^(import\s+(?:type\s+)?)([\s\S]*?)(\s+from\s+['"][^'"]+['"];?\s*)$/);
    if (!m) { out.push(line); continue; }
    const [, head, spec, tail] = m;
    const wholeCount = (name) => (src.match(new RegExp(`\\b${name.replace(/[$-]/g, '\\$&')}\\b`, 'g')) ?? []).length;
    if (!spec.includes('{')) {
      // default/namespace import: drop the binding only if fully unused
      const binding = spec.trim().split(',')[0].trim().split(' ')[0];
      if (binding && names.includes(binding) && wholeCount(binding) === 1) {
        removedCount += 1;
        continue; // drop the whole import line
      }
      out.push(line);
      continue;
    }
    const [beforeBrace, bracePart] = spec.split('{', 2);
    const closing = bracePart.indexOf('}');
    const named = bracePart.slice(0, closing);
    const afterBrace = bracePart.slice(closing + 1);
    const defaultPart = beforeBrace.replace(/,\s*$/, '').trim();
    const specs = named.split(',').map((s) => s.trim()).filter(Boolean);
    const kept = specs.filter((s) => {
      const local = s.split(/\s+as\s+/).pop().trim();
      if (names.includes(local) && wholeCount(local) === 1) {
        removedCount += 1;
        return false;
      }
      return true;
    });
    let defaultKept = defaultPart;
    if (defaultPart && names.includes(defaultPart) && wholeCount(defaultPart) === 1) {
      defaultKept = '';
      removedCount += 1;
    }
    if (!kept.length && !defaultKept) continue; // drop whole line
    const namedPart = kept.length ? `{ ${kept.join(', ')} }` : '';
    const joined = [defaultKept, namedPart].filter(Boolean).join(', ');
    out.push(`${head}${joined}${tail}`);
  }
  const next = out.join(eol);
  if (next !== src) writeFileSync(file, next);
}

console.log(`removed ${removedCount} unused import specifiers across ${byFile.size} files`);
