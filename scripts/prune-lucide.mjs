// Removes lucide-react named imports that ESLint reports as unused.
// Does not touch used icons or non-lucide imports.
import { ESLint } from 'eslint';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

const eslint = new ESLint();
const results = await eslint.lintFiles(['src']);
const byFile = new Map();

for (const result of results) {
  const unused = result.messages
    .filter((m) => m.ruleId === '@typescript-eslint/no-unused-vars')
    .map((m) => {
      const match = m.message.match(/^'([^']+)'/);
      return match ? { name: match[1], line: m.line } : null;
    })
    .filter(Boolean);
  if (unused.length) byFile.set(result.filePath, unused);
}

let files = 0;
let names = 0;
for (const [file, unused] of byFile) {
  let source = readFileSync(file, 'utf8');
  const lucide = source.match(/import\s+\{([\s\S]*?)\}\s+from\s+['"]lucide-react['"]/);
  if (!lucide) continue;
  const drop = new Set(unused.map((u) => u.name));
  const kept = lucide[1]
    .split(',')
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const id = part.split(/\s+as\s+/)[0].trim();
      if (drop.has(id)) { names += 1; return false; }
      return true;
    });
  if (kept.length === lucide[1].split(',').map((p) => p.trim()).filter(Boolean).length) continue;
  const nextImport = kept.length
    ? `import {\n ${kept.join(',\n ')}\n} from "lucide-react"`
    : '';
  source = source.replace(lucide[0], nextImport);
  source = source.replace(/\n{3,}/g, '\n\n');
  writeFileSync(file, source);
  files += 1;
  console.log(relative(process.cwd(), file));
}
console.log(`pruned ${names} lucide names in ${files} files`);
