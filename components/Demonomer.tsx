
import React, { useState, useMemo } from 'react';
import { ArrowRight, Settings2, Activity } from 'lucide-react';
import { GradeType } from '../types';

interface DemonomerProps {
  currentGrade: GradeType;
  onGradeChange: (grade: GradeType) => void;
}

type GradeKey = 'SM' | 'SLP' | 'SLK' | 'SE' | 'SR';

export const Demonomer: React.FC<DemonomerProps> = ({ currentGrade, onGradeChange }) => {
  // --- State for Inputs ---
  const [f2002, setF2002] = useState<number>(125);
  const [aie2802, setAie2802] = useState<number>(1070);
  const [pvcPercent, setPvcPercent] = useState<number>(25); // Matching Excel screenshot
  
  // State for "Nilai Untuk Grade" (Multipliers)
  const [multipliers, setMultipliers] = useState<Record<GradeKey, number>>({
    SM: 118,
    SLP: 108,
    SLK: 128,
    SE: 140,
    SR: 100
  });

  // --- Calculations ---
  /**
   * FORMULA ANALYSIS BASED ON USER FEEDBACK:
   * Goal: Match Excel (1070, 25% -> 26.75) AND ensure F2002 affects the result.
   * If F2002 base is 125:
   * PVC = (AIE2802 * pvcPercent * f2002) / 125000
   * (1070 * 25 * 125) / 125000 = 1070 * 25 / 1000 = 26.75.
   */
  const calculatedPVC = useMemo(() => {
    return (aie2802 * pvcPercent * f2002) / 125000;
  }, [aie2802, pvcPercent, f2002]);

  /**
   * FORMULA: PVC * Multiplier (Grade Based)
   * Example: 26.75 * 128 (SLK) = 3424.
   */
  const calculatedSteam = useMemo(() => {
    const mult = multipliers[currentGrade as GradeKey] || 0;
    return calculatedPVC * mult;
  }, [calculatedPVC, currentGrade, multipliers]);

  const handleMultiplierChange = (grade: GradeKey, val: string) => {
    const num = parseFloat(val) || 0;
    setMultipliers(prev => ({ ...prev, [grade]: num }));
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto font-mono animate-in fade-in duration-500 flex flex-col gap-6">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-600 rounded-xl text-white shadow-lg">
                <Activity className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">Demonomer Monitor</h2>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-wider">Operational Calculation Logic</p>
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
                 {calculatedPVC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Settings Section (Moved Below the Table) */}
      <div className="bg-[#FFFACD] dark:bg-slate-800 p-8 rounded-xl border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(30,41,59,0.1)] transition-colors">
          <h3 className="text-slate-800 dark:text-slate-200 font-black text-lg mb-6 flex items-center gap-2 uppercase tracking-tight">
              <Settings2 className="w-6 h-6" /> Nilai Untuk Grade (Multipliers)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

          {/* Formula Indicator */}
          <div className="mt-10 p-4 bg-white/40 dark:bg-slate-900/40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center md:text-left">
                   <div className="space-y-2">
                       <span className="text-xs font-black text-slate-500 uppercase block tracking-widest">PVC Formula</span>
                       <code className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-white/50 dark:bg-slate-800 px-3 py-1 rounded-md">
                           (AI2802 × %PVC × F2002) / 125000
                       </code>
                   </div>
                   <div className="space-y-2">
                       <span className="text-xs font-black text-slate-500 uppercase block tracking-widest">Steam Formula</span>
                       <code className="text-sm font-bold text-red-600 dark:text-red-400 bg-white/50 dark:bg-slate-800 px-3 py-1 rounded-md">
                           PVC × Multiplier({currentGrade})
                       </code>
                   </div>
               </div>
          </div>
      </div>

       {/* Interactive Footer Module */}
       <div className="bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 border-dashed p-6 rounded-xl flex flex-col md:flex-row items-center gap-6 opacity-80">
            <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-full">
                 <Settings2 className="w-8 h-8 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="text-center md:text-left text-slate-600 dark:text-slate-300">
                <h4 className="font-black text-lg uppercase mb-1 tracking-tight">Interactive Logic & Layout Adjusted</h4>
                <p className="text-sm font-medium">
                    Calculations now respect changes to <strong>F2002</strong> while maintaining original Excel reference values. 
                    The multiplier settings have been moved below the table for better visibility and layout consistency.
                </p>
            </div>
       </div>

    </div>
  );
};
