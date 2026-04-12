const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/text-slate-900 px-2 py-1/g, 'text-slate-900 dark:text-slate-100 px-2 py-1');
content = content.replace(/hover:text-slate-900/g, 'hover:text-slate-900 dark:hover:text-white');
content = content.replace(/text-slate-900' : 'bg-purple-600/g, "text-slate-900 dark:text-slate-900' : 'bg-purple-600");

fs.writeFileSync('App.tsx', content, 'utf8');
