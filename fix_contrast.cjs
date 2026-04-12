const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/text-slate-400 hover:text-slate-600 dark:hover:text-slate-200/g, 'text-secondary hover:text-slate-700 dark:hover:text-slate-200');
content = content.replace(/text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200/g, 'text-secondary hover:text-slate-700 dark:hover:text-slate-200');
content = content.replace(/text-slate-400 hover:text-slate-600/g, 'text-secondary hover:text-slate-700 dark:hover:text-slate-200');
content = content.replace(/text-slate-400 dark:text-slate-400/g, 'text-slate-400 dark:text-slate-500');

fs.writeFileSync('App.tsx', content, 'utf8');
