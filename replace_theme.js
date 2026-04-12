const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

// Global Backgrounds
content = content.replace(/bg-slate-50 dark:bg-slate-950/g, 'bg-[#F8FAFC] dark:bg-[#0B1120]');

// Main Panels
content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-white dark:bg-[#0F172A]');
content = content.replace(/bg-slate-100 dark:bg-slate-900/g, 'bg-slate-50 dark:bg-[#0F172A]');

// Inner Cards
content = content.replace(/bg-white dark:bg-slate-800/g, 'bg-white dark:bg-[#1E293B]');
content = content.replace(/bg-slate-100 dark:bg-slate-800/g, 'bg-slate-50 dark:bg-[#1E293B]');
content = content.replace(/bg-slate-50 dark:bg-slate-800\/50/g, 'bg-slate-50/50 dark:bg-[#1E293B]/50');

// Borders
content = content.replace(/border-slate-200 dark:border-slate-800/g, 'border-slate-200/60 dark:border-slate-700/50');
content = content.replace(/border-slate-200 dark:border-slate-700/g, 'border-slate-200/60 dark:border-slate-700/50');
content = content.replace(/border-slate-300 dark:border-slate-600/g, 'border-slate-300/50 dark:border-slate-600/50');

// Text
content = content.replace(/text-slate-800 dark:text-slate-200/g, 'text-slate-700 dark:text-slate-300');
content = content.replace(/text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-slate-50');

// Shadows - be careful not to double replace
content = content.replace(/shadow-sm(?! dark:shadow-none)/g, 'shadow-sm dark:shadow-none');
content = content.replace(/shadow-md(?! dark:shadow-none)/g, 'shadow-md dark:shadow-none');
content = content.replace(/shadow-lg(?! dark:shadow-none)/g, 'shadow-lg dark:shadow-none');
content = content.replace(/shadow-xl(?! dark:shadow-none)/g, 'shadow-xl dark:shadow-none');
content = content.replace(/shadow-2xl(?! dark:shadow-none)/g, 'shadow-2xl dark:shadow-none');

fs.writeFileSync('App.tsx', content);
console.log('Replacements done.');
