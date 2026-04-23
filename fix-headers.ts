import * as fs from 'fs';

const pagesToFix = [
  'src/pages/MatchDiscovery.tsx',
  'src/pages/CommunitiesPage.tsx',
  'src/pages/MilestonesPage.tsx',
  'src/pages/MentorsPage.tsx',
  'src/pages/Events.tsx'
];

for(const file of pagesToFix) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/text-2xl font-medium text-stone-900 tracking-tight sm:text-xl/g, 'text-2xl sm:text-3xl font-medium text-stone-900 tracking-tight');
  
  content = content.replace(/text-xl  font-medium tracking-tight text-stone-900/g, 'text-2xl sm:text-3xl font-medium tracking-tight text-stone-900');
  content = content.replace(/text-2xl sm:text-2xl font-medium text-white/g, 'text-2xl sm:text-3xl font-medium text-white');
  content = content.replace(/text-xl font-medium text-stone-900 tracking-tight/g, 'text-2xl font-medium text-stone-900 tracking-tight');
  
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed headers');
