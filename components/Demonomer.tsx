
import React, { useMemo } from 'react';
import { ArrowRight, Settings2, Activity, RotateCcw, Calculator, Info, Database, TrendingUp } from 'lucide-react';
import { GradeType, DemonomerData } from '../types';
import { GRADE_COLORS } from '../constants';

interface DemonomerProps {
  currentGrade: GradeType;
  onGradeChange: (grade: GradeType) => void;
  data: DemonomerData;
  onDataChange: (field: keyof DemonomerData, value: any) => void;
  gradeMode: 'normal' | 'gradeChange';
  onGradeModeChange: (mode: 'normal' | 'gradeChange') => void;
  onOpenFieTrend?: () => void;
}

type GradeKey = 'SM' | 'SLP' | 'SLK' | 'SE' | 'SR';

const DEFAULT_PVC_FORMULA = "F2002*AI2802/1000*%PVC";
const DEFAULT_STEAM_FORMULA = "PVC * Steam Rasio";

export const Demonomer: React.FC<DemonomerProps> = ({ currentGrade, onGradeChange, data, onDataChange, gradeMode, onGradeModeChange, onOpenFieTrend }) => {
  
  // --- Handlers ---
  const handleResetFormulas = () => {
    onDataChange('pvcFormula', DEFAULT_PVC_FORMULA);
    onDataChange('steamFormula', DEFAULT_STEAM_FORMULA);
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
    <div className="p-1 sm:p-2 font-sans animate-in fade-in duration-300 flex flex-col gap-4 relative">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl text-white shadow-md shadow-teal-500/20 shrink-0">
                <Activity className="w-5 h-5" />
            </div>
            <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">STEAM RASIO DEMONOMER</h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 uppercase flex items-center gap-1">
                        <Database className="w-3 h-3 text-teal-500" /> Real-time Sync
                    </span>
                </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button 
                    onClick={() => onGradeModeChange('normal')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${gradeMode === 'normal' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                      NORMAL
                  </button>
                  <button 
                    onClick={() => onGradeModeChange('gradeChange')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${gradeMode === 'gradeChange' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                      GRADE CHANGE
                  </button>
              </div>
              <div className="flex gap-1">
                  {(Object.keys(data.multipliers) as GradeKey[]).map(g => (
                      <button 
                        key={g} 
                        onClick={() => onGradeChange(g as GradeType)}
                        className={`px-2.5 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer ${currentGrade === g ? `${GRADE_COLORS[g]} text-white shadow-sm ring-1 ring-teal-400` : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'}`}
                      >
                          {g}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Main Calculation Table Section - Cycle Time Model */}
      <div className="flex flex-col shadow-xs rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="bg-teal-600 text-white font-black text-xs px-4 py-2.5 flex items-center justify-between uppercase tracking-wider">
              <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  <span>Operational Calculation</span>
              </div>
              <span className="text-[10px] font-bold text-teal-100 bg-teal-700/60 px-2 py-0.5 rounded border border-teal-500/40">
                  Grade Aktif: {currentGrade}
              </span>
          </div>
          <div className="p-3 sm:p-4 overflow-x-auto">
              <table className="w-full min-w-[580px] border-collapse text-center">
                  <thead>
                      <tr>
                          <th 
                            className="w-[18%] border-b border-slate-200 dark:border-slate-800 p-2 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                            onClick={onOpenFieTrend}
                            title="Klik tulisan FIE2002 untuk melihat Grafik Trend Perjam"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>FIE2002</span>
                              <TrendingUp className="w-3.5 h-3.5 text-cyan-500 animate-pulse group-hover:scale-125 transition-transform" />
                            </div>
                          </th>
                          <th className="w-[20%] border-b border-slate-200 dark:border-slate-800 p-2 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                            AI2802
                          </th>
                          <th className="w-[18%] border-b border-slate-200 dark:border-slate-800 p-2 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                            %PVC
                          </th>
                          <th className="w-[22%] border-b border-slate-200 dark:border-slate-800 p-2 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                            PVC RESULT
                          </th>
                          <th className="w-[22%] border-b border-slate-200 dark:border-slate-800 p-2 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                            STEAM TOTAL
                          </th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td className="p-2 align-middle">
                              <input 
                                type="number"
                                step="any"
                                value={data.f2002}
                                onChange={(e) => onDataChange('f2002', parseFloat(e.target.value) || 0)}
                                className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 rounded-xl px-2 py-2 text-base sm:text-lg font-mono font-black text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                          </td>
                          <td className="p-2 align-middle">
                              <input 
                                type="number"
                                step="any"
                                value={data.aie2802}
                                onChange={(e) => onDataChange('aie2802', parseFloat(e.target.value) || 0)}
                                className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 rounded-xl px-2 py-2 text-base sm:text-lg font-mono font-black text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                          </td>
                          <td className="p-2 align-middle">
                              <div className="relative">
                                  <input 
                                    type="number"
                                    step="any"
                                    value={data.pvcPercent}
                                    onChange={(e) => onDataChange('pvcPercent', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 rounded-xl px-2 pr-6 py-2 text-base sm:text-lg font-mono font-black text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400 font-black text-xs pointer-events-none">%</span>
                              </div>
                          </td>
                          <td className="p-2 align-middle">
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl px-2 py-2 text-sm sm:text-base font-mono font-black text-center border border-emerald-200 dark:border-emerald-800/50 truncate" title={calculatedPVC.toString()}>
                                  {calculatedPVC.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                              </div>
                          </td>
                          <td className="p-2 align-middle">
                              <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl px-2 py-1.5 text-xl sm:text-2xl font-mono font-black text-center border border-rose-200 dark:border-rose-800/50 tracking-tight">
                                  {Math.round(calculatedSteam)}
                              </div>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>
      </div>

      {/* Settings & Formula Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Steam Rasio Adjustment */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                      <Settings2 className="w-4 h-4 text-teal-500 shrink-0" />
                      <h3 className="text-slate-900 dark:text-white font-black text-xs sm:text-sm uppercase tracking-tight truncate">
                          ADJUST STEAM RASIO
                      </h3>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 uppercase tracking-wider shrink-0 whitespace-nowrap">
                      PER GRADE CONFIG
                  </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {(Object.keys(data.multipliers) as GradeKey[]).map(g => (
                      <div 
                          key={g} 
                          className={`group flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer ${currentGrade === g ? 'bg-teal-50/70 dark:bg-teal-900/30 border-teal-500 shadow-xs ring-1 ring-teal-400/40' : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                          onClick={() => onGradeChange(g as GradeType)}
                      >
                          <div className="flex justify-between items-center">
                              <span className={`text-xs font-black ${currentGrade === g ? 'text-teal-700 dark:text-teal-300 font-mono' : 'text-slate-600 dark:text-slate-400'}`}>{g}</span>
                              <div className={`w-2 h-2 rounded-full ${currentGrade === g ? 'bg-teal-500 animate-ping' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                          </div>
                          <input 
                              type="number"
                              step="any"
                              value={data.multipliers[g]}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleMultiplierChange(g, e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-base sm:text-lg font-mono font-black text-teal-600 dark:text-teal-400 text-center focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                          />
                      </div>
                  ))}
              </div>
          </div>

          {/* Formula Configuration */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between gap-3">
               <div className="absolute top-3 right-3">
                  <button onClick={handleResetFormulas} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white/60 hover:text-white cursor-pointer" title="Reset Formulas">
                      <RotateCcw className="w-3.5 h-3.5" />
                  </button>
               </div>
               
               <h4 className="text-white font-black text-xs uppercase flex items-center gap-2">
                   <Calculator className="w-4 h-4 text-blue-400" /> FORMULAS
               </h4>

               <div className="space-y-3">
                   <div className="space-y-1">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">PVC CALCULATION</label>
                       <input 
                            type="text"
                            value={data.pvcFormula}
                            onChange={(e) => onDataChange('pvcFormula', e.target.value)}
                            className="w-full font-mono text-[11px] font-bold text-blue-400 bg-white/5 border border-white/10 rounded-xl p-2 focus:bg-white/10 focus:ring-1 focus:ring-blue-400 outline-none"
                       />
                       <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                           <span>VARS: AI2802, %PVC, F2002</span>
                           <span className="text-blue-300 font-bold">R: {calculatedPVC.toFixed(2)}</span>
                       </div>
                   </div>

                   <div className="space-y-1">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">STEAM CALCULATION</label>
                       <input 
                            type="text"
                            value={data.steamFormula}
                            onChange={(e) => onDataChange('steamFormula', e.target.value)}
                            className="w-full font-mono text-[11px] font-bold text-rose-400 bg-white/5 border border-white/10 rounded-xl p-2 focus:bg-white/10 focus:ring-1 focus:ring-rose-400 outline-none"
                       />
                       <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                           <span>VARS: PVC, MULTIPLIER</span>
                           <span className="text-rose-300 font-bold">R: {calculatedSteam.toFixed(0)}</span>
                       </div>
                   </div>
               </div>

               <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                   <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                   <p className="text-[9px] text-slate-400 leading-tight">
                       Formula dievaluasi real-time. Gunakan operator +, -, *, / dan variabel.
                   </p>
               </div>
          </div>
      </div>
    </div>
  );
};
