const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  { search: /\bbg-navy-900\b/g, replace: 'bg-slate-50 dark:bg-navy-900' },
  { search: /\bbg-navy-800\b/g, replace: 'bg-white dark:bg-navy-800' },
  { search: /\bbg-navy-700\b/g, replace: 'bg-slate-100 dark:bg-navy-700' },
  { search: /\bbg-navy-600\b/g, replace: 'bg-slate-200 dark:bg-navy-600' },
  { search: /\bbg-navy-500\b/g, replace: 'bg-slate-300 dark:bg-navy-500' },
  { search: /\bborder-navy-700\b/g, replace: 'border-slate-200 dark:border-navy-700' },
  { search: /\bborder-navy-600\b/g, replace: 'border-slate-300 dark:border-navy-600' },
  { search: /\bborder-navy-500\b/g, replace: 'border-slate-400 dark:border-navy-500' },
  { search: /\btext-white\b/g, replace: 'text-slate-900 dark:text-white' },
  { search: /\btext-gray-400\b/g, replace: 'text-slate-500 dark:text-gray-400' },
  { search: /\btext-gray-300\b/g, replace: 'text-slate-600 dark:text-gray-300' },
  { search: /\btext-gray-200\b/g, replace: 'text-slate-700 dark:text-gray-200' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const { search, replace } of replacements) {
        // Only replace if the replacement isn't already there to avoid dupes
        content = content.replace(search, (match, offset, string) => {
           const beforeString = string.substring(Math.max(0, offset - 15), offset);
           if (beforeString.includes('dark:')) return match; // already handled
           return replace;
        });
      }

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Done mapping theme classes!');
