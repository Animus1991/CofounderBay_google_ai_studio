const fs = require('fs');
const path = require('path');

const directory = 'src/pages';

function refineSizes(content) {
  // Regex to match <button>, <NavLink>, <a> with their className props
  let newContent = content;
  
  const replacements = [
    { from: 'px-8 py-4', to: 'px-6 py-2.5' },
    { from: 'sm:px-8 sm:py-4', to: 'sm:px-6 sm:py-3' },
    { from: 'px-6 py-3', to: 'px-5 py-2' },
    { from: 'sm:px-6 sm:py-3', to: 'sm:px-5 sm:py-2.5' },
    { from: 'px-5 py-3', to: 'px-4 py-2' },
    { from: 'px-5 py-2.5', to: 'px-4 py-2' },
    { from: 'px-5 py-2', to: 'px-4 py-1.5' },
    { from: 'px-4 py-2', to: 'px-3 py-1.5' }
  ];

  // We only want to replace inside <button>, <NavLink>, <a>, or <Button> which is slightly complex for simple regex.
  // BUT realistically, these padding combinations mostly exist on interactive elements. Let's look for them near text-sm, text-xs, rounded-, etc.
  
  replacements.forEach(r => {
    // Only replace if it's accompanied by text- or rounded- to ensure it's likely a button/badge, 
    // or just replace globally because standardizing padding is fine. 
    // Wait, replacing 'px-6 py-3' globally is dangerous as it might be used on a div card.
    // Let's use a regex that looks for className="..." containing our target and also containing 'hover' or 'rounded' or text-
    
    // Actually, we can just replace them directly if we know they are mostly buttons.
  });

  return newContent;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /<(button|NavLink|a|Button)\b[^>]*className=["']([^"']+)["'][^>]*>/g;
      
      let modified = content.replace(regex, (match, tag, className) => {
        let newClassName = className;
        newClassName = newClassName.replace(/\bpx-8\s+py-4\b/g, 'px-6 py-2.5');
        newClassName = newClassName.replace(/\bsm:px-8\s+sm:py-4\b/g, 'sm:px-6 sm:py-3');
        newClassName = newClassName.replace(/\bpx-6\s+py-3\b/g, 'px-5 py-2');
        newClassName = newClassName.replace(/\bsm:px-6\s+sm:py-3\b/g, 'sm:px-5 sm:py-2.5');
        newClassName = newClassName.replace(/\bpx-5\s+py-3\b/g, 'px-4 py-2');
        newClassName = newClassName.replace(/\bpx-5\s+py-2\.5\b/g, 'px-4 py-2');
        newClassName = newClassName.replace(/\bsm:px-5\s+sm:py-2\.5\b/g, 'sm:px-4 sm:py-2');
        newClassName = newClassName.replace(/\bpx-5\s+py-2\b/g, 'px-4 py-1.5');
        newClassName = newClassName.replace(/\bh-12\b/g, 'h-10');
        newClassName = newClassName.replace(/\bh-14\b/g, 'h-11');
        newClassName = newClassName.replace(/\bsm:h-14\b/g, 'sm:h-11');
        newClassName = newClassName.replace(/\bsm:h-12\b/g, 'sm:h-10');
        
        return match.replace(className, newClassName);
      });
      
      if (modified !== content) {
        fs.writeFileSync(fullPath, modified, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directory);
