
import React, { useMemo } from 'react';
import { ArrowRight, Settings2, Activity, RotateCcw, Calculator, Info, Database } from 'lucide-react';
import { GradeType, DemonomerData } from '../types';
import { GRADE_COLORS } from '../constants';

interface DemonomerProps {
 currentGrade: GradeType;
 onGradeChange: (grade: GradeType) => void;
 data: DemonomerData;
 onDataChange: (field: keyof DemonomerData, value: any) => void;
 gradeMode: 'normal' | 'gradeChange';
 onGradeModeChange: (mode: 'normal' | 'gradeChange') => void;
}

type GradeKey = 'SM' | 'SLP' | 'SLK' | 'SE' | 'SR';

const DEFAULT_PVC_FORMULA = "F2002*AI2802/1000*%PVC";
const DEFAULT_STEAM_FORMULA = "PVC * Steam Rasio";

export const Demonomer: React.FC<DemonomerProps> = ({ currentGrade, onGradeChange, data, onDataChange, gradeMode, onGradeModeChange }) => {
 
 const currentGradeColor = GRADE_COLORS[currentGrade] || 'bg-teal-600';

 // --- Handlers ---
 const handleResetFormulas = () => {
 if (window.confirm("Reset formulas to default factory settings?")) {
 onDataChange('pvcFormula', DEFAULT_PVC_FORMULA);
 onDataChange('steamFormula', DEFAULT_STEAM_FORMULA);
 }
 };

 const handleMultiplierChange = (grade: GradeKey, val: string) => {
 const num = parseFloat(val) || 0;
 onDataChange('multipliers', { ...data.multipliers, [grade]: num });
 };

 // --- Dynamic Calculation Logic ---
 const evaluateMath = (expression: string, vars: Record<string, number>): number => {
 let expr = expression;
 // Sort keys by length desc to prevent partial replacement issues (e.g. replacing PVC inside %PVC)
 const sortedKeys = Object.keys(vars).sort((a, b) => b.length - a.length);
 
 for (const key of sortedKeys) {
 // Escape special regex characters in variable names (like %)
 const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const regex = new RegExp(escapedKey, 'g');
 expr = expr.replace(regex, String(vars[key]));
 }

 try {
 // Allow standard math operators and numbers
 const cleanExpr = expr.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '');
 if (!cleanExpr.trim()) return 0;
 const result = new Function('return ' + expr)();
 return isFinite(result) ? result : 0;
 } catch (e) {
 return 0;
 }
 };

 const calculatedPVC = useMemo(() => {
 return evaluateMath(data.pvcFormula, {
 'AI2802': data.aie2802,
 '%PVC': data.pvcPercent / 100,
 'F2002': data.f2002
 });
 }, [data.aie2802, data.pvcPercent, data.f2002, data.pvcFormula]);

 const calculatedSteam = useMemo(() => {
 const mult = data.multipliers[currentGrade as GradeKey] || 0;
 return evaluateMath(data.steamFormula, {
 'PVC': calculatedPVC,
 'Steam Rasio': mult,
 'Multiplier': mult // Keep for backward compatibility
 });
 }, [calculatedPVC, currentGrade, data.multipliers, data.steamFormula]);

 return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans animate-in fade-in duration-700 flex flex-col gap-10 relative bg-slate-50/30 dark:bg-slate-900/30 rounded-[3rem]">
 
 {/* Header Section */}
       <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/40 dark:border-slate-700/40 shadow-sm">
         <div className="flex items-center gap-6">
           <div className={`p-5 rounded-3xl text-white shadow-2xl ${currentGradeColor} shadow-indigo-500/20 ring-4 ring-white`}>
             <Activity className="w-10 h-10" />
 </div>
 <div>
             <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-slate-50 dark:to-slate-300">
              STEAM <span className="text-indigo-600">RATIO</span> CALC
            </h2>
             <div className="flex items-center gap-3 mt-2">
               <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-4 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/50 uppercase flex items-center gap-2 tracking-widest shadow-sm">
                 <Database className="w-3.5 h-3.5" /> Real-time Sync
 </span>
 </div>
 </div>
 </div>

         <div className="bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-[2rem] border border-slate-200/50 dark:border-slate-700/50 shadow-inner flex flex-wrap items-center gap-4">
           <div className="flex bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
 <button 
 onClick={() => onGradeModeChange('normal')}
               className={`px-8 py-3.5 rounded-xl font-black text-xs tracking-widest transition-all duration-300 ${gradeMode === 'normal' ? `bg-slate-900 dark:bg-slate-700 text-white shadow-lg` : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
 >
 NORMAL
 </button>
 <button 
 onClick={() => onGradeModeChange('gradeChange')}
               className={`px-8 py-3.5 rounded-xl font-black text-xs tracking-widest transition-all duration-300 ${gradeMode === 'gradeChange' ? `bg-slate-900 dark:bg-slate-700 text-white shadow-lg` : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
 >
 GRADE CHANGE
 </button>
 </div>
           <div className="h-12 w-px bg-slate-300/50 dark:bg-slate-600/50 hidden sm:block"></div>
           <div className="flex gap-2.5 p-1">
 {(Object.keys(data.multipliers) as GradeKey[]).map(g => (
 <button 
 key={g} 
 onClick={() => onGradeChange(g as GradeType)}
                 className={`px-7 py-3.5 rounded-xl font-black text-sm tracking-tighter transition-all duration-300 ${currentGrade === g ? `${GRADE_COLORS[g]} text-white shadow-xl ring-2 ring-white` : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-600 hover:shadow-sm'}`}
 >
 {g}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Main Calculation Table Section - Cycle Time Model */}
       <div className="flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] overflow-hidden border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
         <div className={`${currentGradeColor} text-white font-black text-sm px-8 py-5 flex items-center gap-3 uppercase tracking-[0.25em] shadow-lg`}>
           <Calculator className="w-5 h-5 text-white/80" />
 Operational Calculation
 </div>
         <div className="p-8 overflow-x-auto">
           <table className="w-full border-separate border-spacing-x-4 text-center">
 <thead>
 <tr>
                 <th className="p-4 text-slate-400 uppercase tracking-[0.3em] text-[10px] font-black">FIE2002</th>
                 <th className="p-4 text-slate-400 uppercase tracking-[0.3em] text-[10px] font-black">AI2802</th>
                 <th className="p-4 text-slate-400 uppercase tracking-[0.3em] text-[10px] font-black">%PVC</th>
                 <th className="p-4 text-indigo-400 uppercase tracking-[0.3em] text-[10px] font-black">PVC RESULT</th>
                 <th className="p-4 text-rose-400 uppercase tracking-[0.3em] text-[10px] font-black">STEAM TOTAL</th>
 </tr>
 </thead>
             <tbody>
              <tr>
                <td className="p-2">
                  <div className="relative group">
                    <input 
                      type="number"
                      value={data.f2002}
                      onChange={(e) => onDataChange('f2002', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 dark:text-slate-50 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] p-6 text-4xl font-black text-center focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/10 transition-all outline-none shadow-inner"
                    />
                    <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[8px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">INPUT</div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="relative group">
                    <input 
                      type="number"
                      value={data.aie2802}
                      onChange={(e) => onDataChange('aie2802', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 dark:text-slate-50 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] p-6 text-4xl font-black text-center focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/10 transition-all outline-none shadow-inner"
                    />
                    <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[8px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">INPUT</div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="relative group">
                    <input 
                      type="number"
                      value={data.pvcPercent}
                      onChange={(e) => onDataChange('pvcPercent', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 dark:text-slate-50 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] p-6 text-4xl font-black text-center focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/10 transition-all outline-none shadow-inner"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl">%</span>
                    <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[8px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">INPUT</div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-[1.5rem] p-6 text-4xl font-black text-center border-2 border-indigo-100/50 dark:border-indigo-800/50 shadow-sm ring-4 ring-indigo-50/30 dark:ring-indigo-900/30">
                    {calculatedPVC.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-rose-50/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-[1.5rem] p-6 text-6xl font-black text-center border-2 border-rose-100/50 dark:border-rose-800/50 shadow-sm ring-4 ring-rose-50/30 dark:ring-rose-900/30 tracking-tighter">
                    {Math.round(calculatedSteam)}
                  </div>
                </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

  {/* Settings & Formula Section */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* Steam Rasio Adjustment */}
    <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-200/60 dark:border-slate-700/60 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -z-10 rounded-full -mr-32 -mt-32"></div>
      
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-slate-50 font-black text-2xl tracking-tight">ADJUST <span className="text-indigo-600">STEAM</span> RATIO</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Per Grade Configuration</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {(Object.keys(data.multipliers) as GradeKey[]).map(g => (
          <div 
            key={g} 
            className={`group flex flex-col gap-3 p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer relative overflow-hidden ${currentGrade === g ? 'bg-white dark:bg-slate-700 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-4 ring-indigo-500/5' : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-700'}`}
            onClick={() => onGradeChange(g as GradeType)}
          >
            {currentGrade === g && <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/10 blur-xl rounded-full -mr-6 -mt-6"></div>}
            
            <div className="flex justify-between items-center">
              <span className={`text-lg font-black transition-colors ${currentGrade === g ? 'text-indigo-600' : 'text-slate-400'}`}>{g}</span>
              <div className={`w-2 h-2 rounded-full transition-all duration-500 ${currentGrade === g ? 'bg-indigo-500 scale-125 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-200 dark:bg-slate-600'}`}></div>
            </div>
            
            <div className="relative">
              <input 
                type="number"
                value={data.multipliers[g]}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleMultiplierChange(g, e.target.value)}
                className={`w-full bg-white dark:bg-slate-800 border-2 rounded-xl p-2 sm:p-3 text-lg sm:text-xl font-black text-center outline-none transition-all shadow-inner ${currentGrade === g ? 'border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 focus:border-indigo-500' : 'border-slate-100 dark:border-slate-700 text-slate-400 focus:border-slate-300 dark:focus:border-slate-500'}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Formula Configuration */}
    <div className="bg-slate-900 dark:bg-slate-950 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-slate-800">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10 rounded-full -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 blur-[100px] -z-10 rounded-full -ml-32 -mb-32"></div>
      
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700">
            <Calculator className="w-6 h-6 text-indigo-400" />
          </div>
          <h4 className="text-white font-black text-xl tracking-tight uppercase">FORMULAS</h4>
        </div>
        <button onClick={handleResetFormulas} className="p-3 bg-white/5 hover:bg-white dark:hover:bg-slate-700/10 rounded-2xl transition-all text-white/40 hover:text-white border border-white/5 group" title="Reset Formulas">
          <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>

      <div className="space-y-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">PVC CALCULATION</label>
            <div className="px-2 py-1 bg-indigo-500/10 rounded text-indigo-400 text-[8px] font-black uppercase tracking-widest">REAL-TIME</div>
          </div>
          <div className="relative group">
            <input 
              type="text"
              value={data.pvcFormula}
              onChange={(e) => onDataChange('pvcFormula', e.target.value)}
              className="w-full font-mono text-xs font-bold text-indigo-400 bg-slate-800/50 border-2 border-slate-800 rounded-2xl p-5 focus:border-indigo-500/50 focus:bg-slate-800 outline-none transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-slate-500">VARS: AI2802, %PVC, F2002</span>
            <span className="text-indigo-400/80 bg-indigo-400/5 px-2 py-1 rounded">RESULT: {calculatedPVC.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">STEAM CALCULATION</label>
            <div className="px-2 py-1 bg-rose-500/10 rounded text-rose-400 text-[8px] font-black uppercase tracking-widest">REAL-TIME</div>
          </div>
          <div className="relative group">
            <input 
              type="text"
              value={data.steamFormula}
              onChange={(e) => onDataChange('steamFormula', e.target.value)}
              className="w-full font-mono text-xs font-bold text-rose-400 bg-slate-800/50 border-2 border-slate-800 rounded-2xl p-5 focus:border-rose-500/50 focus:bg-slate-800 outline-none transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-slate-500">VARS: PVC, MULTIPLIER</span>
            <span className="text-rose-400/80 bg-rose-400/5 px-2 py-1 rounded">RESULT: {calculatedSteam.toFixed(0)}</span>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-white/5 flex items-start gap-4">
        <div className="p-2 bg-indigo-500/10 rounded-xl">
          <Info className="w-4 h-4 text-indigo-400" />
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-wider">
          Formulas are evaluated in real-time. Use standard operators (+, -, *, /) and defined variables.
        </p>
      </div>
    </div>
  </div>
 </div>
 );
};
