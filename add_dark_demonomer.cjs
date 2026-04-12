const fs = require('fs');

function addDarkClasses(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Backgrounds
  content = content.replace(/bg-slate-50\/30/g, 'bg-slate-50/30 dark:bg-slate-900/30');
  content = content.replace(/bg-white\/60/g, 'bg-white/60 dark:bg-slate-800/60');
  content = content.replace(/bg-slate-100\/50/g, 'bg-slate-100/50 dark:bg-slate-800/50');
  content = content.replace(/bg-white\/80/g, 'bg-white/80 dark:bg-slate-900/80');
  content = content.replace(/bg-slate-900 text-white/g, 'bg-slate-900 dark:bg-slate-700 text-white');
  content = content.replace(/bg-slate-50 text-slate-900/g, 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50');
  content = content.replace(/focus:bg-white/g, 'focus:bg-white dark:focus:bg-slate-800');
  content = content.replace(/bg-indigo-50\/50/g, 'bg-indigo-50/50 dark:bg-indigo-900/20');
  content = content.replace(/bg-rose-50\/50/g, 'bg-rose-50/50 dark:bg-rose-900/20');
  content = content.replace(/bg-white border-indigo-500/g, 'bg-white dark:bg-slate-700 border-indigo-500');
  content = content.replace(/bg-slate-50\/50 border-slate-100/g, 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700');
  content = content.replace(/hover:bg-white/g, 'hover:bg-white dark:hover:bg-slate-700');
  content = content.replace(/bg-white border-2/g, 'bg-white dark:bg-slate-800 border-2');
  content = content.replace(/bg-slate-900 p-10/g, 'bg-slate-900 dark:bg-slate-950 p-10');
  content = content.replace(/bg-indigo-50 text-indigo-600/g, 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400');

  // Borders
  content = content.replace(/border-white\/40/g, 'border-white/40 dark:border-slate-700/40');
  content = content.replace(/border-slate-200\/50/g, 'border-slate-200/50 dark:border-slate-700/50');
  content = content.replace(/border-slate-200\/60/g, 'border-slate-200/60 dark:border-slate-700/60');
  content = content.replace(/border-slate-100/g, 'border-slate-100 dark:border-slate-700');
  content = content.replace(/border-indigo-100\/50/g, 'border-indigo-100/50 dark:border-indigo-800/50');
  content = content.replace(/border-rose-100\/50/g, 'border-rose-100/50 dark:border-rose-800/50');
  content = content.replace(/border-indigo-100 text-indigo-600/g, 'border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400');
  content = content.replace(/border-slate-100 text-slate-400/g, 'border-slate-100 dark:border-slate-700 text-slate-400');
  content = content.replace(/focus:border-slate-300/g, 'focus:border-slate-300 dark:focus:border-slate-500');
  content = content.replace(/hover:border-slate-200/g, 'hover:border-slate-200 dark:hover:border-slate-600');
  content = content.replace(/border-indigo-100 uppercase/g, 'border-indigo-100 dark:border-indigo-800/50 uppercase');

  // Text
  content = content.replace(/text-slate-900/g, 'text-slate-900 dark:text-slate-50');
  content = content.replace(/from-slate-900 to-slate-600/g, 'from-slate-900 to-slate-600 dark:from-slate-50 dark:to-slate-300');
  content = content.replace(/text-indigo-700/g, 'text-indigo-700 dark:text-indigo-300');
  content = content.replace(/text-rose-700/g, 'text-rose-700 dark:text-rose-300');
  content = content.replace(/text-slate-400 hover:text-slate-600/g, 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200');

  // Rings
  content = content.replace(/ring-indigo-50\/30/g, 'ring-indigo-50/30 dark:ring-indigo-900/30');
  content = content.replace(/ring-rose-50\/30/g, 'ring-rose-50/30 dark:ring-rose-900/30');

  // Others
  content = content.replace(/bg-slate-300\/50/g, 'bg-slate-300/50 dark:bg-slate-600/50');
  content = content.replace(/bg-slate-200/g, 'bg-slate-200 dark:bg-slate-600');

  fs.writeFileSync(filePath, content);
}

addDarkClasses('components/Demonomer.tsx');
console.log('Done');
