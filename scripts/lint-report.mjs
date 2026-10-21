// Groups the current ESLint warnings by rule and by file so a cleanup pass can
// be driven from one list instead of scrolling the stylish output.
import { ESLint } from 'eslint';
import { relative } from 'node:path';

const rule = process.argv[2] ?? '';
const eslint = new ESLint();
const results = await eslint.lintFiles(['.']);

const byRule = new Map();
for (const result of results) {
  for (const message of result.messages) {
    if (!message.ruleId) continue;
    if (rule && !message.ruleId.includes(rule)) continue;
    const list = byRule.get(message.ruleId) ?? [];
    list.push(`${relative(process.cwd(), result.filePath).replace(/\\/g, '/')}:${message.line} ${message.message}`);
    byRule.set(message.ruleId, list);
  }
}

for (const [ruleId, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n### ${ruleId} (${list.length})`);
  for (const line of list.sort()) console.log(line);
}
