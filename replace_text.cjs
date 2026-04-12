const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/text-slate-800 dark:text-white/g, 'text-slate-800 dark:text-slate-100');
content = content.replace(/text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-slate-50');

fs.writeFileSync('App.tsx', content);
console.log('Text replacements done.');
