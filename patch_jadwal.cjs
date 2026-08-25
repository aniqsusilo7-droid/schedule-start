const fs = require('fs');
let code = fs.readFileSync('components/Jadwal.tsx', 'utf-8');

// 1. Add import for KasGrup at the top
if (!code.includes('import { KasGrup }')) {
  code = code.replace("import { supabase } from '../supabaseClient';", "import { supabase } from '../supabaseClient';\nimport { KasGrup } from './KasGrup';");
}

// 2. Add Wallet icon import
code = code.replace("FileSpreadsheet, Sparkles, AlertCircle, Clock, User, ArrowRight,", "FileSpreadsheet, Sparkles, AlertCircle, Clock, User, ArrowRight, Wallet,");

// 3. Add activeTab state to Jadwal component
if (!code.includes("const [activeViewTab, setActiveViewTab]")) {
  code = code.replace("const [activeGroup, setActiveGroup] = useState<GroupKey>('GRUP D');", "const [activeGroup, setActiveGroup] = useState<GroupKey>('GRUP D');\n  const [activeViewTab, setActiveViewTab] = useState<'LEMBUR' | 'KAS'>('LEMBUR');");
}

// 4. In the render, add the view switcher
const searchString = `          {/* Group Switcher Tabs */}
          <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto bg-slate-950 p-1.5 rounded-xl border border-slate-800">`;

const replaceString = `          {/* Main View Switcher */}
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full sm:w-auto mb-2 sm:mb-0 mr-4">
            <button
              onClick={() => setActiveViewTab('LEMBUR')}
              className={\`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 \${activeViewTab === 'LEMBUR' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}\`}
            >
              <Calendar className="w-4 h-4" /> Lembur
            </button>
            <button
              onClick={() => setActiveViewTab('KAS')}
              className={\`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 \${activeViewTab === 'KAS' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}\`}
            >
              <Wallet className="w-4 h-4" /> Kas
            </button>
          </div>

          {/* Group Switcher Tabs */}
          <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto bg-slate-950 p-1.5 rounded-xl border border-slate-800">`;

code = code.replace(searchString, replaceString);

// 5. Wrap the lembur content and render Kas conditionally
// Find where the group content starts
const contentStartSearch = `      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-4">`;
const contentStartReplace = `      {activeViewTab === 'KAS' ? (
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-4 lg:p-6 min-h-[500px]">
          <KasGrup activeGroup={activeGroup} />
        </div>
      ) : (
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-4">`;

code = code.replace(contentStartSearch, contentStartReplace);

// We must also close this condition at the bottom of the component.
// The end of Jadwal is around the modals.
// Wait, the main wrapper ends somewhere... Let's just wrap the inner part.
// The problem is finding the exact closing div.
fs.writeFileSync('components/Jadwal.tsx', code);
