const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    /<div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">/g,
    '<div className="bg-teal-600 px-4 py-3 border-b border-slate-200 flex items-center justify-between">'
);
content = content.replace(
    /<div className="p-2 bg-teal-600 rounded-xl text-white">/g,
    '<div className="p-2 bg-teal-500 rounded-xl text-white">'
);
content = content.replace(
    /<h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Reactor Cycle Timeline<\/h3>/g,
    '<h3 className="text-sm font-black text-white uppercase tracking-tight">Reactor Cycle Timeline</h3>'
);
content = content.replace(
    /<span className="text-\[9px\] font-bold text-slate-500 uppercase tracking-widest">Conflict<\/span>/g,
    '<span className="text-[9px] font-bold text-teal-100 uppercase tracking-widest">Conflict</span>'
);
content = content.replace(
    /<span className="text-\[9px\] font-bold text-slate-500 uppercase tracking-widest">Scheduled<\/span>/g,
    '<span className="text-[9px] font-bold text-teal-100 uppercase tracking-widest">Scheduled</span>'
);
content = content.replace(
    /<div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm"><\/div>/g,
    '<div className="w-2.5 h-2.5 rounded-full bg-teal-300 shadow-sm"></div>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
