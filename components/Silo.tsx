
import React from 'react';
import { Database, CheckCircle2, Play } from 'lucide-react';
import { SiloData } from '../types';

interface SiloProps {
    activeSilo: 'O' | 'P' | 'Q' | null;
    silos: Record<'O' | 'P' | 'Q', SiloData>;
    onDataChange?: (siloId: 'O'|'P'|'Q', field: keyof SiloData, value: any) => void;
    onSiloSelect?: (siloId: 'O'|'P'|'Q') => void;
}

export const Silo: React.FC<SiloProps> = ({ activeSilo, silos, onDataChange, onSiloSelect }) => {
  
  // Helper to handle input changes
  const handleChange = (id: 'O'|'P'|'Q', field: keyof SiloData, val: string) => {
      if (!onDataChange) return;
      onDataChange(id, field, val);
  };

  // Helper for conditional styling for Columns
  const getColumnClass = (siloId: 'O'|'P'|'Q') => {
      if (activeSilo === siloId) {
          return "bg-emerald-100/50 border-emerald-500/50";
      }
      return "bg-slate-50"; // Default neutral background
  };

  // Helper for conditional styling for Headers
  const getHeaderClass = (siloId: 'O'|'P'|'Q') => {
      if (activeSilo === siloId) {
          return "bg-emerald-600 ring-inset ring-4 ring-yellow-400 z-10 scale-105 shadow-xl opacity-100";
      }
      return "bg-black opacity-80 scale-95";
  };

  // Helper for Input Styling (Empty vs Filled)
  const getInputClass = (value: any, filledColor: string = 'text-black', activeBorder: boolean = false) => {
      const hasValue = value !== '' && value !== null && value !== undefined;
      const base = "w-full h-full text-center font-bold text-xl outline-none transition-all duration-200 rounded";
      
      if (hasValue) {
          return `${base} bg-white shadow-sm ${filledColor} ${activeBorder ? 'border-2 border-emerald-400' : 'border border-slate-300'}`;
      }
      return `${base} bg-transparent border border-transparent placeholder-slate-400 opacity-60 focus:bg-white focus:opacity-100 focus:shadow-md`;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-mono animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-600 rounded-xl text-white shadow-lg">
                <Database className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">SILO MONITOR</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-sm tracking-wider">O - P - Q Control</p>
            </div>
          </div>
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-bold border border-yellow-200 animate-pulse">
             LIVE DATA
          </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(30,41,59,0.2)] overflow-hidden rounded-xl max-w-6xl transition-colors">
        
        {/* Main Grid: Labels + 3 Silos */}
        <div className="grid grid-cols-[160px_1fr_1fr_1fr] gap-[2px] bg-slate-800 border-b-[2px] border-slate-800">
            
            {/* Header Row */}
            <div className="bg-[#FFF8DC] dark:bg-slate-800 p-4 flex items-center justify-center font-black text-xl text-slate-800 dark:text-slate-200 border-r-2 border-slate-800">SILO</div>
            <div className={`p-6 flex items-center justify-center font-black text-5xl tracking-widest relative transition-all duration-300 border-r-2 border-slate-800 ${activeSilo === 'O' ? 'bg-teal-600 text-white animate-pulse ring-4 ring-teal-300 dark:ring-teal-900 z-10' : 'bg-[#FFF8DC] dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                O
            </div>
            <div className={`p-6 flex items-center justify-center font-black text-5xl tracking-widest relative transition-all duration-300 border-r-2 border-slate-800 ${activeSilo === 'P' ? 'bg-teal-600 text-white animate-pulse ring-4 ring-teal-300 dark:ring-teal-900 z-10' : 'bg-[#FFF8DC] dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                P
            </div>
            <div className={`p-6 flex items-center justify-center font-black text-5xl tracking-widest relative transition-all duration-300 ${activeSilo === 'Q' ? 'bg-teal-600 text-white animate-pulse ring-4 ring-teal-300 dark:ring-teal-900 z-10' : 'bg-[#FFF8DC] dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                Q
            </div>

            {/* ACTION / STATUS Row */}
            <div className="bg-slate-100 dark:bg-slate-700 p-2 flex items-center justify-center text-sm font-black uppercase text-center leading-tight text-slate-600 dark:text-slate-300 border-r-2 border-slate-800">ACTION</div>
            {['O', 'P', 'Q'].map((siloId) => (
                <div key={`action-${siloId}`} className={`p-3 flex items-center justify-center bg-white dark:bg-slate-900 border-r-2 border-slate-800 last:border-r-0`}>
                     {activeSilo === siloId ? (
                         <div className="w-full h-full flex items-center justify-center">
                            <div className="flex items-center justify-center gap-1 bg-emerald-600 text-white px-4 py-3 rounded font-bold text-sm shadow-lg animate-pulse w-full border-2 border-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                                CHARGING
                            </div>
                         </div>
                     ) : (
                         <button 
                            onClick={() => onSiloSelect && onSiloSelect(siloId as 'O'|'P'|'Q')}
                            className="w-full flex items-center justify-center gap-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 px-4 py-3 rounded font-bold text-xs border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all shadow-sm uppercase whitespace-nowrap"
                         >
                             <Play className="w-4 h-4" />
                             CHANGE SILO
                         </button>
                     )}
                </div>
            ))}

            {/* Lot Number Row */}
            <div className="bg-slate-100 dark:bg-slate-700 p-2 flex items-center justify-center text-sm font-black uppercase text-center leading-tight text-slate-600 dark:text-slate-300 border-r-2 border-slate-800">LOT NUMBER</div>
            <div className="p-2 bg-white dark:bg-slate-900 border-r-2 border-slate-800">
                <input 
                    type="text" 
                    value={silos.O.lotNumber} 
                    onChange={(e) => handleChange('O', 'lotNumber', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-2 text-xl font-bold text-center text-red-600 dark:text-red-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="---"
                />
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 border-r-2 border-slate-800">
                <input 
                    type="text" 
                    value={silos.P.lotNumber}
                    onChange={(e) => handleChange('P', 'lotNumber', e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-2 text-xl font-bold text-center text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="---"
                />
            </div>
            <div className="p-2 bg-white dark:bg-slate-900">
                <input 
                    type="text" 
                    value={silos.Q.lotNumber}
                    onChange={(e) => handleChange('Q', 'lotNumber', e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-2 text-xl font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="---"
                />
            </div>

            {/* Set Row */}
            <div className="bg-slate-100 dark:bg-slate-700 p-2 flex items-center justify-center text-sm font-black uppercase text-slate-600 dark:text-slate-300 border-r-2 border-slate-800">SET</div>
            
            <div className="p-3 bg-white dark:bg-slate-900 border-r-2 border-slate-800 flex items-center justify-between px-6 font-bold text-2xl">
                <input 
                    type="number" 
                    value={silos.O.capacitySet} 
                    onChange={(e) => handleChange('O', 'capacitySet', e.target.value)}
                    className="w-full bg-transparent text-center text-red-600 dark:text-red-400 outline-none"
                    placeholder="-"
                /> 
                <span className="text-base text-slate-400 ml-2">T</span>
            </div>
            
            <div className="p-3 bg-white dark:bg-slate-900 border-r-2 border-slate-800 flex items-center justify-between px-6 font-bold text-2xl">
                 <input 
                    type="number" 
                    value={silos.P.capacitySet} 
                    onChange={(e) => handleChange('P', 'capacitySet', e.target.value)}
                    className="w-full bg-transparent text-center text-emerald-600 dark:text-emerald-400 outline-none"
                    placeholder="-"
                /> 
                <span className="text-base text-slate-400 ml-2">T</span>
            </div>
            
             <div className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between px-6 font-bold text-2xl">
                 <input 
                    type="number" 
                    value={silos.Q.capacitySet} 
                    onChange={(e) => handleChange('Q', 'capacitySet', e.target.value)}
                    className="w-full bg-transparent text-center text-slate-800 dark:text-slate-200 outline-none"
                    placeholder="-"
                /> 
                <span className="text-base text-slate-400 ml-2">T</span>
            </div>

            {/* Start Row */}
            <div className="bg-slate-100 dark:bg-slate-700 p-2 flex items-center justify-center text-sm font-black uppercase text-slate-600 dark:text-slate-300 border-r-2 border-slate-800">START</div>
            <div className="p-2 bg-white dark:bg-slate-900 border-r-2 border-slate-800">
                <input 
                    type="text"
                    placeholder="--:--" 
                    value={silos.O.startTime || ''}
                    onChange={(e) => handleChange('O', 'startTime', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-2 text-lg font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 border-r-2 border-slate-800">
                <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.P.startTime || ''}
                    onChange={(e) => handleChange('P', 'startTime', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-2 text-lg font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
            </div>
            <div className="p-2 bg-white dark:bg-slate-900">
                 <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.Q.startTime || ''}
                    onChange={(e) => handleChange('Q', 'startTime', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-2 text-lg font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
            </div>

             {/* Finish Row */}
            <div className="bg-slate-100 dark:bg-slate-700 p-2 flex items-center justify-center text-sm font-black uppercase text-slate-600 dark:text-slate-300 border-r-2 border-slate-800">FINISH</div>
            <div className="p-2 bg-white dark:bg-slate-900 border-r-2 border-slate-800">
                <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.O.finishTime || ''}
                    onChange={(e) => handleChange('O', 'finishTime', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-2 text-lg font-bold text-center text-red-600 dark:text-red-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 border-r-2 border-slate-800">
                <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.P.finishTime || ''}
                    onChange={(e) => handleChange('P', 'finishTime', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-2 text-lg font-bold text-center text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
            </div>
            <div className="p-2 bg-white dark:bg-slate-900">
                <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.Q.finishTime || ''}
                    onChange={(e) => handleChange('Q', 'finishTime', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-2 text-lg font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
            </div>
        </div>

        {/* Update Section */}
        <div className="grid grid-cols-[160px_1fr] bg-slate-800 gap-[2px]">
            {/* Left Label */}
             <div className="bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center gap-4 py-2 text-slate-800 dark:text-slate-200 border-r-2 border-slate-800">
                 <div className="text-sm font-black bg-slate-200 dark:bg-slate-600 w-full text-center py-1">UPDATE</div>
                 
                 <div className="flex flex-col gap-6 w-full px-2">
                     <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 p-1 text-center font-bold text-xl text-slate-500 dark:text-slate-400">06:00</div>
                     <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 p-1 text-center font-bold text-xl text-slate-500 dark:text-slate-400">14:00</div>
                     <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 p-1 text-center font-bold text-xl text-slate-500 dark:text-slate-400">22:00</div>
                 </div>
             </div>

             {/* Matrix of updates */}
             <div className="grid grid-cols-3 gap-[2px] bg-slate-800">
                {/* Silo O Col */}
                <div className="flex flex-col gap-[2px]">
                     <UpdateRow 
                        val={silos.O.percentage.toString()} 
                        total={silos.O.totalUpdate.toString()} 
                        onPercentChange={(v) => handleChange('O', 'percentage', v)}
                        onTotalChange={(v) => handleChange('O', 'totalUpdate', v)}
                        getInputClass={getInputClass}
                    />
                     <UpdateRow val="" total="" isEmpty getInputClass={getInputClass} />
                     <UpdateRow val="" total="" isEmpty getInputClass={getInputClass} />
                </div>
                {/* Silo P Col */}
                <div className="flex flex-col gap-[2px]">
                     <UpdateRow val="" total="" isEmpty getInputClass={getInputClass} />
                     <UpdateRow 
                        val={silos.P.percentage.toString()} 
                        total={silos.P.totalUpdate.toString()} 
                        onPercentChange={(v) => handleChange('P', 'percentage', v)}
                        onTotalChange={(v) => handleChange('P', 'totalUpdate', v)}
                        isHash 
                        getInputClass={getInputClass}
                    />
                     <UpdateRow val="" total="" isEmpty getInputClass={getInputClass} />
                </div>
                 {/* Silo Q Col */}
                <div className="flex flex-col gap-[2px]">
                     <UpdateRow val="" total="" isEmpty getInputClass={getInputClass} />
                     <UpdateRow val="" total="" isEmpty getInputClass={getInputClass} />
                     <UpdateRow 
                        val={silos.Q.percentage.toString()} 
                        total={silos.Q.totalUpdate.toString()} 
                        onPercentChange={(v) => handleChange('Q', 'percentage', v)}
                        onTotalChange={(v) => handleChange('Q', 'totalUpdate', v)}
                        isHash 
                        getInputClass={getInputClass}
                    />
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};

// Helper for the update rows
interface UpdateRowProps {
    val: string;
    total: string;
    isEmpty?: boolean;
    isHash?: boolean;
    onPercentChange?: (v: string) => void;
    onTotalChange?: (v: string) => void;
    getInputClass: (val: any, color?: string) => string;
}

const UpdateRow = ({val, total, isEmpty, isHash, onPercentChange, onTotalChange, getInputClass}: UpdateRowProps) => (
    <div className="bg-slate-50 h-[64px] flex items-center border border-slate-200 text-black">
        <div className={`w-16 h-full flex items-center justify-center font-bold text-xl border-r border-slate-300 bg-slate-100`}>
            {isEmpty ? (
                <span className="w-full h-full bg-transparent"></span>
            ) : (
                <input 
                    type="number" 
                    value={val} 
                    onChange={(e) => onPercentChange && onPercentChange(e.target.value)}
                    className={getInputClass(val, 'bg-yellow-300 text-black')}
                    placeholder="%"
                />
            )}
        </div>
        <div className="w-8 h-full flex items-center justify-center font-bold text-slate-400 text-sm border-r border-slate-300 bg-slate-100 select-none">
            %
        </div>
        <div className="flex-1 h-full flex items-center justify-between px-2 font-bold text-lg bg-white">
             {isEmpty ? (
                 <span className="w-full h-full bg-transparent"></span>
             ) : (
                 <input 
                    type="number" 
                    value={total} 
                    onChange={(e) => onTotalChange && onTotalChange(e.target.value)}
                    className={getInputClass(total, 'bg-white text-black')}
                    placeholder="0.0"
                />
             )}
             <span className="text-slate-400 text-sm ml-1 select-none">T</span>
        </div>
    </div>
);
