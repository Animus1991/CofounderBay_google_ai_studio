import * as fs from 'fs';
import * as path from 'path';

function walkSync(dir: string, filelist: string[] = []) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const dirFile = path.join(dir, file);
      const dirent = fs.statSync(dirFile);
      if (dirent.isDirectory()) {
        filelist = walkSync(dirFile, filelist);
      } else {
        if (dirFile.endsWith('.tsx')) {
          filelist.push(dirFile);
        }
      }
    }
  }
  return filelist;
}

const files = [...walkSync('src/pages'), ...walkSync('src/components')];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Hero H1
  content = content.replace(/text-4xl lg:text-5xl/g, 'text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl');
  content = content.replace(/text-3xl md:text-4xl lg:text-4xl/g, 'text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl');
  
  // Section H2
  content = content.replace(/text-3xl lg:text-4xl/g, 'text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl');
  
  // H2/H3 headers
  content = content.replace(/text-2xl sm:text-3xl/g, 'text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl');
  content = content.replace(/text-2xl font-medium/g, 'text-xl sm:text-2xl md:text-3xl 2xl:text-4xl font-medium');
  content = content.replace(/text-2xl  font-medium/g, 'text-xl sm:text-2xl md:text-3xl 2xl:text-4xl font-medium');

  // Subtitles / Paragraphs
  content = content.replace(/text-xl text-stone-500/g, 'text-base sm:text-lg md:text-xl xl:text-2xl text-stone-500');
  content = content.replace(/text-lg text-stone-500/g, 'text-sm flex-1 sm:text-base md:text-lg xl:text-xl text-stone-500');
  content = content.replace(/text-lg text-stone-300/g, 'text-sm sm:text-base md:text-lg xl:text-xl text-stone-300');
  content = content.replace(/text-xl font-medium text-stone-900/g, 'text-lg sm:text-xl md:text-2xl font-medium text-stone-900');
  
  // Feature Cards H3
  content = content.replace(/text-xl font-medium text-stone-900 mb-3/g, 'text-lg sm:text-xl md:text-2xl font-medium text-stone-900 mb-2 sm:mb-3');
  
  // Feature Cards Desc
  content = content.replace(/text-stone-500 text-sm leading-relaxed/g, 'text-stone-500 text-xs sm:text-sm md:text-base leading-relaxed');

  // Buttons
  content = content.replace(/text-lg font-semibold/g, 'text-base sm:text-lg font-semibold');
  content = content.replace(/text-xl font-medium hover:bg-stone-800/g, 'text-base sm:text-lg font-medium hover:bg-stone-800');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

console.log('Responsive typography applied.');
