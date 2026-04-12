const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/text-slate-500 dark:text-slate-300/g, 'text-secondary dark:text-slate-300');
content = content.replace(/text-slate-400 dark:text-slate-500/g, 'text-secondary');
content = content.replace(/bg-slate-200 text-slate-500/g, 'bg-slate-200 text-secondary');

fs.writeFileSync('App.tsx', content, 'utf8');
