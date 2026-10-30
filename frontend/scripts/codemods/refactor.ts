import * as fs from 'fs';
import * as path from 'path';

const dirToProcess = ['./src/pages', './src/components'];

function walkSync(dir: string, filelist: string[] = []) {
  if(!fs.existsSync(dir)) return filelist;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
      filelist.push(filepath);
    }
  }
  return filelist;
}

let files: string[] = [];
dirToProcess.forEach(dir => {
  files = walkSync(dir, files);
});

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Shift extreme scale down explicitly
  // Match full words avoiding boundaries that overwrite smaller tags
  content = content.replace(/\btext-7xl\b/g, 'text-5xl');
  content = content.replace(/\btext-6xl\b/g, 'text-4xl');
  // text-5xl gets bumped to text-3xl or text-4xl depending on layout. Let's do 3xl
  content = content.replace(/\btext-5xl\b/g, 'text-3xl');
  content = content.replace(/\btext-4xl\b/g, 'text-2xl');
  content = content.replace(/\btext-3xl\b/g, 'text-xl');
  
  // Fix arbitrary micro typography and extreme spacing
  content = content.replace(/text-\[9px\]/g, 'text-xs');
  content = content.replace(/text-\[10px\]/g, 'text-xs');
  content = content.replace(/text-\[11px\]/g, 'text-xs');
  content = content.replace(/text-\[12px\]/g, 'text-sm');
  
  // tracking-[0.2em] up to tracking-[0.4em] is extremely wide. Use standard tracking-wider
  content = content.replace(/tracking-\[0\.[12345]em\]/g, 'tracking-wider');
  content = content.replace(/tracking-\[-0\.\d+em\]/g, 'tracking-tight');
  
  // arbitrary leading
  content = content.replace(/leading-\[\d*\.?\d+\]/g, 'leading-snug');
  
  // Font weights to be less brutalist
  content = content.replace(/\bfont-black\b/g, 'font-bold');
  content = content.replace(/\bfont-extrabold\b/g, 'font-semibold');
  // Downgrade font-bold to font-medium for standard UI controls and subheadings, except maybe some keep font-semibold. 
  // Replacing ALL font-bold with font-medium might be aggressive. Let's use font-semibold to be safe and clean.
  content = content.replace(/\bfont-bold\b/g, 'font-medium');
  
  // Remove "font-display" as minimal SaaS usually sticks to one clean sans font
  content = content.replace(/\bfont-display\b/g, '');

  fs.writeFileSync(file, content, 'utf8');
}
console.log("Refactoring complete");
