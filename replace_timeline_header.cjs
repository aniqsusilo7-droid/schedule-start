const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `<div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
  <div className="flex items-center gap-3">
  <div className="p-2 bg-teal-600 rounded-xl text-white">
  <Activity className="w-4 h-4" />
  </div>
  <div>
  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Reactor Cycle Timeline</h3>
  </div>
  </div>
  <div className="flex items-center gap-4">
  <div className="flex items-center gap-2">
  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm"></div>
  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Conflict</span>
  </div>
  <div className="flex items-center gap-2">
  <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm"></div>
  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Scheduled</span>
  </div>
  </div>
  </div>`;

const replacement = `<div className="bg-teal-600 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
  <div className="flex items-center gap-3">
  <div className="p-2 bg-teal-500 rounded-xl text-white">
  <Activity className="w-4 h-4" />
  </div>
  <div>
  <h3 className="text-sm font-black text-white uppercase tracking-tight">Reactor Cycle Timeline</h3>
  </div>
  </div>
  <div className="flex items-center gap-4">
  <div className="flex items-center gap-2">
  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm"></div>
  <span className="text-[9px] font-bold text-teal-100 uppercase tracking-widest">Conflict</span>
  </div>
  <div className="flex items-center gap-2">
  <div className="w-2.5 h-2.5 rounded-full bg-teal-300 shadow-sm"></div>
  <span className="text-[9px] font-bold text-teal-100 uppercase tracking-widest">Scheduled</span>
  </div>
  </div>
  </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
