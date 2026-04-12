const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/bg-slate-900\/50/g, 'bg-[#0F172A]/50');
content = content.replace(/bg-slate-800\/50/g, 'bg-[#1E293B]/50');
content = content.replace(/bg-slate-800\/30/g, 'bg-[#1E293B]/30');
content = content.replace(/bg-slate-900/g, 'bg-[#0F172A]');
content = content.replace(/bg-slate-800/g, 'bg-[#1E293B]');

fs.writeFileSync('App.tsx', content);
console.log('Background replacements done.');
