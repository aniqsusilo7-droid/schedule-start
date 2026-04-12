const fs = require('fs');

let content = fs.readFileSync('components/Demonomer.tsx', 'utf8');

content = content.replace(/text-slate-400 hover:text-slate-600/g, 'text-secondary hover:text-slate-700 dark:hover:text-slate-200');
content = content.replace(/text-slate-400/g, 'text-secondary');

fs.writeFileSync('components/Demonomer.tsx', content, 'utf8');
