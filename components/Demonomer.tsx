
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans animate-in fade-in duration-500 flex flex-col gap-8 relative">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl text-white shadow-xl shadow-teal-500/20">
                <Activity className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">Demonomer Monitor</h2>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-sm tracking-widest">Operational Intelligence</p>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 uppercase flex items-center gap-1">
                        <Database className="w-4 h-4" /> Real-time Sync
                    </span>
                </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
              <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                  <button 
                    onClick={() => onGradeModeChange('normal')}
                    className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${gradeMode === 'normal' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      NORMAL
                  </button>
                  <button 
                    onClick={() => onGradeModeChange('gradeChange')}
                    className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${gradeMode === 'gradeChange' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      GRADE CHANGE
                  </button>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
              <div className="flex gap-2 p-1">
                  {(Object.keys(data.multipliers) as GradeKey[]).map(g => (
                      <button 
                        key={g} 
                        onClick={() => onGradeChange(g as GradeType)}
                        className={`px-6 py-3 rounded-xl font-bold text-base transition-all ${currentGrade === g ? `${GRADE_COLORS[g]} text-white shadow-lg shadow-${GRADE_COLORS[g].split('-')[1]}-500/30` : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                          {g}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Main Calculation Table Section - Cycle Time Model */}
      <div className="flex flex-col shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="bg-teal-600 text-white font-black text-base px-6 py-4 flex items-center gap-2 uppercase tracking-widest">
              <Calculator className="w-5 h-5" />
              Operational Calculation Matrix
          </div>
          <div className="p-6 overflow-x-auto">
              <table className="w-full border-collapse text-center">
                  <thead>
                      <tr>
                          <th className="border-b-2 border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-xs font-bold">FIE2002</th>
                          <th className="border-b-2 border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-xs font-bold">AI2802</th>
                          <th className="border-b-2 border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-xs font-bold">%PVC</th>
                          <th className="border-b-2 border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-xs font-bold">PVC RESULT</th>
                          <th className="border-b-2 border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-xs font-bold">STEAM TOTAL</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td className="p-4">
                              <input 
                                type="number"
                                value={data.f2002}
                                onChange={(e) => onDataChange('f2002', parseFloat(e.target.value) || 0)}
                                className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-none rounded-xl p-4 text-4xl font-black text-center focus:ring-4 focus:ring-blue-500/30 transition-all"
                              />
                          </td>
                          <td className="p-4">
                              <input 
                                type="number"
                                value={data.aie2802}
                                onChange={(e) => onDataChange('aie2802', parseFloat(e.target.value) || 0)}
                                className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-none rounded-xl p-4 text-4xl font-black text-center focus:ring-4 focus:ring-blue-500/30 transition-all"
                              />
                          </td>
                          <td className="p-4">
                              <div className="relative">
                                  <input 
                                    type="number"
                                    value={data.pvcPercent}
                                    onChange={(e) => onDataChange('pvcPercent', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-none rounded-xl p-4 text-4xl font-black text-center focus:ring-4 focus:ring-blue-500/30 transition-all"
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 font-black text-2xl">%</span>
                              </div>
                          </td>
                          <td className="p-4">
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl p-4 text-4xl font-black text-center border-2 border-emerald-100 dark:border-emerald-800/50">
                                  {calculatedPVC.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                              </div>
                          </td>
                          <td className="p-4">
                              <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-xl p-4 text-6xl font-black text-center border-2 border-rose-100 dark:border-rose-800/50 tracking-tighter">
                                  {Math.round(calculatedSteam)}
                              </div>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>
      </div>

      {/* Settings & Formula Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Steam Rasio Adjustment */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                  <h3 className="text-slate-900 dark:text-white font-extrabold text-2xl flex items-center gap-3">
                      <Settings2 className="w-8 h-8 text-teal-500" /> ADJUST STEAM RASIO
                  </h3>
                  <div className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 uppercase tracking-widest">
                      PER GRADE CONFIG
                  </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {(Object.keys(data.multipliers) as GradeKey[]).map(g => (
                      <div 
                          key={g} 
                          className={`group flex flex-col gap-3 p-6 rounded-3xl border-2 transition-all cursor-pointer ${currentGrade === g ? 'bg-teal-50/50 dark:bg-teal-900/20 border-teal-500 shadow-lg shadow-teal-500/10' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                          onClick={() => onGradeChange(g as GradeType)}
                      >
                          <div className="flex justify-between items-center">
                              <span className={`text-2xl font-black transition-colors ${currentGrade === g ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400'}`}>{g}</span>
                              <div className={`w-3 h-3 rounded-full ${currentGrade === g ? 'bg-teal-500 animate-ping' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                          </div>
                          <input 
                              type="number"
                              value={data.multipliers[g]}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleMultiplierChange(g, e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-2xl font-black text-teal-600 dark:text-teal-400 text-center focus:ring-4 focus:ring-teal-500/20 outline-none transition-all"
                          />
                      </div>
                  ))}
              </div>
          </div>

          {/* Formula Configuration */}
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6">
                  <button onClick={handleResetFormulas} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white/40 hover:text-white" title="Reset Formulas">
                      <RotateCcw className="w-4 h-4" />
                  </button>
               </div>
               
               <h4 className="text-white font-extrabold text-lg mb-8 flex items-center gap-3">
                   <Calculator className="w-6 h-6 text-blue-400" /> FORMULAS
               </h4>

               <div className="space-y-8">
                   <div className="space-y-3">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">PVC CALCULATION</label>
                       <input 
                            type="text"
                            value={data.pvcFormula}
                            onChange={(e) => onDataChange('pvcFormula', e.target.value)}
                            className="w-full font-mono text-xs font-bold text-blue-400 bg-white/5 border border-white/10 rounded-2xl p-4 focus:bg-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                       />
                       <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                           <span>VARS: AI2802, %PVC, F2002</span>
                           <span className="text-blue-400/60">RESULT: {calculatedPVC.toFixed(2)}</span>
                       </div>
                   </div>

                   <div className="space-y-3">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">STEAM CALCULATION</label>
                       <input 
                            type="text"
                            value={data.steamFormula}
                            onChange={(e) => onDataChange('steamFormula', e.target.value)}
                            className="w-full font-mono text-xs font-bold text-rose-400 bg-white/5 border border-white/10 rounded-2xl p-4 focus:bg-white/10 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                       />
                       <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                           <span>VARS: PVC, MULTIPLIER</span>
                           <span className="text-rose-400/60">RESULT: {calculatedSteam.toFixed(0)}</span>
                       </div>
                   </div>
               </div>

               <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-3">
                   <div className="p-2 bg-blue-500/20 rounded-lg">
                       <Info className="w-4 h-4 text-blue-400" />
                   </div>
                   <p className="text-[10px] text-slate-400 leading-relaxed">
                       Formulas are evaluated in real-time. Use standard operators (+, -, *, /) and defined variables.
                   </p>
               </div>
          </div>
      </div>
    </div>
  );
};
