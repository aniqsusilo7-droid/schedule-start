const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/\|\| 'bg-slate-200'} text-white/g, "|| 'bg-slate-500'} text-white");

fs.writeFileSync('App.tsx', content, 'utf8');
