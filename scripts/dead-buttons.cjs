const fs = require('fs'), path = require('path');
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : (e.name.endsWith('.tsx') ? [path.join(d, e.name)] : []));
}
const files = [...walk('src/pages'), ...walk('src/components')];
const hits = [];
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!/<button/.test(l)) continue;
    const ctx = lines.slice(i, i + 3).join(' ');
    if (/onClick|type=.submit.|disabled|<Button/.test(ctx)) continue;
    if (/<button[^>]*>/.test(l) === false && !/<\/button|className/.test(l)) continue;
    hits.push(`${f.replace(/\\/g, '/').replace('src/', '')}:${i + 1} ${l.trim().slice(0, 100)}`);
  }
}
console.log(hits.join('\n'));
console.log('TOTAL', hits.length);
