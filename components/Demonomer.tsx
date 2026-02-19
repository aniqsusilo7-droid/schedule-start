
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Settings2, Activity, RotateCcw, Calculator, Info, Database } from 'lucide-react';
import { GradeType } from '../types';

interface DemonomerProps {
  currentGrade: GradeType;
  onGradeChange: (grade: GradeType) => void;
}

type GradeKey = 'SM' | 'SLP' | 'SLK' | 'SE' | 'SR';

const DEFAULT_PVC_FORMULA = "F2002*AI2802/1000*%PVC";
const DEFAULT_STEAM_FORMULA = "PVC * Multiplier";

export const Demonomer: React.FC<DemonomerProps> = ({ currentGrade, onGradeChange }) => {
  // --- State for Inputs (Initialized from LocalStorage) ---
  const [f2002, setF2002] = useState<number>(() => {
      const saved = localStorage.getItem('demonomer_f2002');
      return saved ? parseFloat(saved) : 125;
  });

  const [aie2802, setAie2802] = useState<number>(() => {
      const saved = localStorage.getItem('demonomer_aie2802');
      return saved ? parseFloat(saved) : 1070;
  });

  const [pvcPercent, setPvcPercent] = useState<number>(() => {
      const saved = localStorage.getItem('demonomer_pvc_percent');
      return saved ? parseFloat(saved) : 25;
  });
  
  // State for "Nilai Untuk Grade" (Multipliers)
  const [multipliers, setMultipliers] = useState<Record<GradeKey, number>>(() => {
      const saved = localStorage.getItem('demonomer_multipliers');
      return saved ? JSON.parse(saved) : {
        SM: 118,
        SLP: 108,
        SLK: 128,
        SE: 140,
        SR: 100
      };
  });

  // --- Formula State ---
  const [pvcFormula, setPvcFormula] = useState(() => localStorage.getItem('demonomer_pvc_formula') || DEFAULT_PVC_FORMULA);
  const [steamFormula, setSteamFormula] = useState(() => localStorage.getItem('demonomer_steam_formula') || DEFAULT_STEAM_FORMULA);

  // --- Persistence Effects (Auto-save to LocalStorage) ---
  useEffect(() => localStorage.setItem('demonomer_f2002', f2002.toString()), [f2002]);
  useEffect(() => localStorage.setItem('demonomer_aie2802', aie2802.toString()), [aie2802]);
  useEffect(() => localStorage.setItem('demonomer_pvc_percent', pvcPercent.toString()), [pvcPercent]);
  useEffect(() => localStorage.setItem('demonomer_multipliers', JSON.stringify(multipliers)), [multipliers]);
  useEffect(() => localStorage.setItem('demonomer_pvc_formula', pvcFormula), [pvcFormula]);
  useEffect(() => localStorage.setItem('demonomer_steam_formula', steamFormula), [steamFormula]);

  // --- Handlers ---
  const handleResetFormulas = () => {
    if (window.confirm("Reset formulas to default factory settings?")) {
        setPvcFormula(DEFAULT_PVC_FORMULA);
        setSteamFormula(DEFAULT_STEAM_FORMULA);
    }
  };

  const handleMultiplierChange = (grade: GradeKey, val: string) => {
    const num = parseFloat(val) || 0;
    setMultipliers(prev => ({ ...prev, [grade]: num }));
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
    return evaluateMath(pvcFormula, {
        'AI2802': aie2802,
        '%PVC': pvcPercent / 100,
        'F2002': f2002
    });
  }, [aie2802, pvcPercent, f2002, pvcFormula]);

  const calculatedSteam = useMemo(() => {
    const mult = multipliers[currentGrade as GradeKey] || 0;
    return evaluateMath(steamFormula, {
        'PVC': calculatedPVC,
        'Multiplier': mult
    });
  }, [calculatedPVC, currentGrade, multipliers, steamFormula]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto font-mono animate-in fade-in duration-500 flex flex-col gap-6 relative">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-600 rounded-xl text-white shadow-lg">
                <Activity className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">Demonomer Monitor</h2>
                <div className="flex items-center gap-2">
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-wider">Operational Calculation Logic</p>
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 uppercase flex items-center gap-1">
                        <Database className="w-3 h-3" /> Local Storage
                    </span>
                </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border-2 border-slate-800 flex items-center gap-4">
              <span className="text-xs font-black text-slate-500 uppercase px-2">ACTIVE GRADE</span>
              <div className="flex gap-1">
                  {(Object.keys(multipliers) as GradeKey[]).map(g => (
                      <button 
                        key={g} 
                        onClick={() => onGradeChange(g as GradeType)}
                        className={`px-4 py-1 rounded font-black transition-all ${currentGrade === g ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600'}`}
                      >
                          {g}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Main Calculation Table Section */}
      <div className="bg-white dark:bg-slate-900 border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(30,41,59,0.2)] overflow-hidden rounded-xl">
        {/* Header Row */}
        <div className="grid grid-cols-5 border-b-4 border-slate-800 bg-[#FFF8DC] dark:bg-slate-800 transition-colors uppercase">
          <div className="p-4 border-r-2 border-slate-800 font-black text-center text-xl text-slate-800 dark:text-slate-200">F2002</div>
          <div className="p-4 border-r-2 border-slate-800 font-black text-center text-xl text-slate-800 dark:text-slate-200">AI2802</div>
          <div className="p-4 border-r-2 border-slate-800 font-black text-center text-xl text-slate-800 dark:text-slate-200">%PVC</div>
          <div className="p-4 border-r-2 border-slate-800 font-black text-center text-xl text-slate-800 dark:text-slate-200">PVC</div>
          <div className="p-4 font-black text-center text-xl text-slate-800 dark:text-slate-200">Steam</div>
        </div>

        {/* Interactive Value Row */}
        <div className="grid grid-cols-5 bg-white dark:bg-slate-900 min-h-[100px] transition-colors">
          <div className="p-2 border-r-2 border-slate-800 flex items-center justify-center">
             <div className="relative w-full px-2">
                <input 
                    type="number"
                    value={f2002}
                    onChange={(e) => setF2002(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded p-2 text-3xl font-black text-center text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-teal-100 transition-all"
                />
                <span className="absolute -top-1 left-4 text-[9px] font-black text-slate-400 uppercase">Lot Factor</span>
             </div>
          </div>
          
          <div className="p-2 border-r-2 border-slate-800 flex items-center justify-center">
            <div className="relative w-full px-2">
                <input 
                    type="number"
                    value={aie2802}
                    onChange={(e) => setAie2802(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded p-2 text-3xl font-black text-center text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-teal-100 transition-all"
                />
                <span className="absolute -top-1 left-4 text-[9px] font-black text-slate-400 uppercase">Input Qty</span>
             </div>
          </div>

          <div className="p-2 border-r-2 border-slate-800 flex items-center justify-center">
             <div className="relative w-full px-2">
                <input 
                    type="number"
                    value={pvcPercent}
                    onChange={(e) => setPvcPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded p-2 text-3xl font-black text-center text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-teal-100 transition-all"
                />
                <span className="absolute -top-1 left-4 text-[9px] font-black text-slate-400 uppercase">Percent %</span>
             </div>
          </div>

          <div className="p-2 border-r-2 border-slate-800 flex flex-col items-center justify-center bg-teal-50 dark:bg-teal-900/10">
             <span className="text-4xl font-black tracking-tighter text-blue-700 dark:text-blue-400">
                 {calculatedPVC.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
             </span>
             <span className="text-[9px] font-bold text-blue-600 uppercase mt-1">Resulting PVC</span>
          </div>

          <div className="p-2 flex items-center justify-center relative bg-white dark:bg-slate-900 overflow-hidden">
             <div className="absolute inset-0 opacity-5 bg-red-100 dark:bg-red-900"></div>
             <div className="flex flex-col items-center z-10">
                <span className="text-6xl font-black text-red-600 tracking-tighter drop-shadow-sm">
                    {Math.round(calculatedSteam)}
                </span>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Calculated Steam</span>
             </div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-[#FFFACD] dark:bg-slate-800 p-8 rounded-xl border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(30,41,59,0.1)] transition-colors">
          <h3 className="text-slate-800 dark:text-slate-200 font-black text-lg mb-6 flex items-center gap-2 uppercase tracking-tight">
              <Settings2 className="w-6 h-6" /> Nilai Untuk Grade (Multipliers)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {(Object.keys(multipliers) as GradeKey[]).map(g => (
                  <div 
                      key={g} 
                      className={`flex flex-col gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${currentGrade === g ? 'bg-[#EEE8AA] dark:bg-teal-900/40 border-teal-600 shadow-md ring-2 ring-teal-200' : 'bg-white/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'}`}
                      onClick={() => onGradeChange(g as GradeType)}
                  >
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-2xl font-black text-slate-800 dark:text-white uppercase">{g}</span>
                          <ArrowRight className={`w-5 h-5 ${currentGrade === g ? 'text-teal-700' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex items-center gap-2">
                          <input 
                              type="number"
                              value={multipliers[g]}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleMultiplierChange(g, e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-1 text-2xl font-bold text-teal-700 dark:text-teal-400 text-center focus:ring-2 focus:ring-teal-400 outline-none transition-all"
                          />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Multiplier</span>
                  </div>
              ))}
          </div>

          {/* Editable Formula Section */}
          <div className="mt-6 p-6 bg-white/60 dark:bg-slate-900/40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl relative">
               <div className="absolute top-0 right-0 p-4">
                  <button onClick={handleResetFormulas} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase" title="Reset to Factory Defaults">
                      <RotateCcw className="w-3 h-3" /> Reset Formulas
                  </button>
               </div>
               
               <h4 className="text-slate-800 dark:text-slate-200 font-black text-sm mb-4 flex items-center gap-2 uppercase">
                   <Calculator className="w-4 h-4" /> Formula Configuration (Editable)
               </h4>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* PVC Formula Input */}
                   <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase block tracking-widest flex justify-between">
                           <span>PVC Formula</span>
                           <span className="text-[10px] normal-case opacity-70">Vars: AI2802, %PVC, F2002</span>
                       </label>
                       <div className="relative group">
                            <input 
                                type="text"
                                value={pvcFormula}
                                onChange={(e) => setPvcFormula(e.target.value)}
                                className="w-full font-mono text-sm font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            />
                       </div>
                       <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                           <Info className="w-3 h-3" /> Result: {calculatedPVC.toFixed(4)}
                       </p>
                   </div>
                   
                   {/* Steam Formula Input */}
                   <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase block tracking-widest flex justify-between">
                           <span>Steam Formula</span>
                           <span className="text-[10px] normal-case opacity-70">Vars: PVC, Multiplier</span>
                       </label>
                       <div className="relative group">
                            <input 
                                type="text"
                                value={steamFormula}
                                onChange={(e) => setSteamFormula(e.target.value)}
                                className="w-full font-mono text-sm font-bold text-red-700 dark:text-red-300 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm"
                            />
                       </div>
                       <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                           <Info className="w-3 h-3" /> Result: {calculatedSteam.toFixed(2)}
                       </p>
                   </div>
               </div>
          </div>
      </div>
    </div>
  );
};
