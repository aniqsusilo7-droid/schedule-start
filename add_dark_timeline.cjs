const fs = require('fs');

function addDarkClasses(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/bg-white rounded-3xl shadow-xl border border-slate-200/g, 'bg-white dark:bg-slate-900 rounded-3xl shadow-xl dark:shadow-none border border-slate-200 dark:border-slate-800');
  content = content.replace(/bg-slate-50 px-6 py-4 border-b border-slate-200/g, 'bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800');
  content = content.replace(/text-slate-900 uppercase tracking-tight/g, 'text-slate-900 dark:text-slate-50 uppercase tracking-tight');
  content = content.replace(/bg-slate-50 border-t border-slate-200/g, 'bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800');

  fs.writeFileSync(filePath, content);
}

addDarkClasses('components/Timeline.tsx');
console.log('Done');
