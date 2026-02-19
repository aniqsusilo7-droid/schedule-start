
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
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">SILO MONITOR</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">O - P - Q Control</p>
            </div>
          </div>
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-xs font-bold border border-yellow-200 animate-pulse">
             LIVE DATA
          </div>
      </div>

      <div className="bg-slate-200 border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(30,41,59,0.2)] overflow-hidden rounded-xl max-w-5xl">
        
        {/* Main Grid: Labels + 3 Silos */}
        <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-[2px] bg-slate-800 border-b-[2px] border-slate-800">
            
            {/* Header Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center font-black text-lg text-black">SILO</div>
            <div className={`text-white p-4 flex items-center justify-center font-black text-3xl tracking-widest relative transition-all duration-300 ${getHeaderClass('O')}`}>
                O
            </div>
            <div className={`text-white p-4 flex items-center justify-center font-black text-3xl tracking-widest relative transition-all duration-300 ${getHeaderClass('P')}`}>
                P
            </div>
            <div className={`text-white p-4 flex items-center justify-center font-black text-3xl tracking-widest relative transition-all duration-300 ${getHeaderClass('Q')}`}>
                Q
            </div>

            {/* ACTION / STATUS Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center text-xs font-black uppercase text-center leading-tight text-black">ACTION</div>
            {['O', 'P', 'Q'].map((siloId) => (
                <div key={`action-${siloId}`} className={`p-2 flex items-center justify-center ${getColumnClass(siloId as 'O'|'P'|'Q')}`}>
                     {activeSilo === siloId ? (
                         <div className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-full font-bold text-xs shadow-lg animate-pulse">
                             <CheckCircle2 className="w-4 h-4" />
                             CHARGING NOW
                         </div>
                     ) : (
                         <button 
                            onClick={() => onSiloSelect && onSiloSelect(siloId as 'O'|'P'|'Q')}
                            className="flex items-center gap-1 bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-3 py-1.5 rounded-full font-bold text-xs border border-slate-300 hover:border-blue-400 transition-all shadow-sm"
                         >
                             <Play className="w-3 h-3" />
                             SELECT & START
                         </button>
                     )}
                </div>
            ))}

            {/* Lot Number Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center text-xs font-black uppercase text-center leading-tight text-black">LOT NUMBER</div>
            <div className={`p-1 ${getColumnClass('O')}`}>
                <input 
                    type="text" 
                    value={silos.O.lotNumber} 
                    onChange={(e) => handleChange('O', 'lotNumber', e.target.value)}
                    className={getInputClass(silos.O.lotNumber, 'text-red-600')} 
                    placeholder="---"
                />
            </div>
            <div className={`p-1 ${getColumnClass('P')}`}>
                <input 
                    type="text" 
                    value={silos.P.lotNumber}
                    onChange={(e) => handleChange('P', 'lotNumber', e.target.value)} 
                    className={getInputClass(silos.P.lotNumber, 'text-emerald-600')} 
                    placeholder="---"
                />
            </div>
            <div className={`p-1 ${getColumnClass('Q')}`}>
                <input 
                    type="text" 
                    value={silos.Q.lotNumber}
                    onChange={(e) => handleChange('Q', 'lotNumber', e.target.value)} 
                    className={getInputClass(silos.Q.lotNumber, 'text-black')} 
                    placeholder="---"
                />
            </div>

            {/* Set Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center text-xs font-black uppercase text-black">SET</div>
            
            <div className={`p-2 flex items-center justify-between px-4 font-bold text-xl ${getColumnClass('O')}`}>
                <input 
                    type="number" 
                    value={silos.O.capacitySet} 
                    onChange={(e) => handleChange('O', 'capacitySet', e.target.value)}
                    className={getInputClass(silos.O.capacitySet, 'text-red-600')}
                    placeholder="-"
                /> 
                <span className="text-sm text-black ml-2">T</span>
            </div>
            
            <div className={`p-2 flex items-center justify-between px-4 font-bold text-xl ${getColumnClass('P')}`}>
                 <input 
                    type="number" 
                    value={silos.P.capacitySet} 
                    onChange={(e) => handleChange('P', 'capacitySet', e.target.value)}
                    className={getInputClass(silos.P.capacitySet, 'text-emerald-600')}
                    placeholder="-"
                /> 
                <span className="text-sm text-black ml-2">T</span>
            </div>
            
             <div className={`p-2 flex items-center justify-between px-4 font-bold text-xl ${getColumnClass('Q')}`}>
                 <input 
                    type="number" 
                    value={silos.Q.capacitySet} 
                    onChange={(e) => handleChange('Q', 'capacitySet', e.target.value)}
                    className={getInputClass(silos.Q.capacitySet, 'text-black')}
                    placeholder="-"
                /> 
                <span className="text-sm text-black ml-2">T</span>
            </div>

            {/* Start Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center text-xs font-black uppercase text-black">START</div>
            <div className={`p-1 ${getColumnClass('O')}`}>
                <input 
                    type="text"
                    placeholder="--:--" 
                    value={silos.O.startTime || ''}
                    onChange={(e) => handleChange('O', 'startTime', e.target.value)}
                    className={getInputClass(silos.O.startTime, 'text-black', true)}
                />
            </div>
            <div className={`p-1 ${getColumnClass('P')}`}>
                <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.P.startTime || ''}
                    onChange={(e) => handleChange('P', 'startTime', e.target.value)}
                    className={getInputClass(silos.P.startTime, 'text-black', true)}
                />
            </div>
            <div className={`p-1 ${getColumnClass('Q')}`}>
                 <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.Q.startTime || ''}
                    onChange={(e) => handleChange('Q', 'startTime', e.target.value)}
                    className={getInputClass(silos.Q.startTime, 'text-black', true)}
                />
            </div>

             {/* Finish Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center text-xs font-black uppercase text-black">FINISH</div>
            <div className={`p-1 ${getColumnClass('O')}`}>
                <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.O.finishTime || ''}
                    onChange={(e) => handleChange('O', 'finishTime', e.target.value)}
                    className={getInputClass(silos.O.finishTime, 'text-red-600')}
                />
            </div>
            <div className={`p-1 ${getColumnClass('P')}`}>
                <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.P.finishTime || ''}
                    onChange={(e) => handleChange('P', 'finishTime', e.target.value)}
                    className={getInputClass(silos.P.finishTime, 'text-emerald-600')}
                />
            </div>
            <div className={`p-1 ${getColumnClass('Q')}`}>
                <input 
                    type="text" 
                    placeholder="--:--"
                    value={silos.Q.finishTime || ''}
                    onChange={(e) => handleChange('Q', 'finishTime', e.target.value)}
                    className={getInputClass(silos.Q.finishTime, 'text-black')}
                />
            </div>
        </div>

        {/* Update Section */}
        <div className="grid grid-cols-[140px_1fr] bg-slate-800 gap-[2px]">
            {/* Left Label */}
             <div className="bg-cyan-200 flex flex-col items-center justify-center gap-4 py-2 text-black">
                 <div className="text-xs font-black bg-white/50 w-full text-center py-1">UPDATE</div>
                 
                 <div className="flex flex-col gap-6 w-full px-2">
                     <div className="bg-slate-100 border-2 border-slate-400 p-1 text-center font-bold text-lg text-slate-400">06:00</div>
                     <div className="bg-slate-100 border-2 border-slate-400 p-1 text-center font-bold text-lg text-slate-400">14:00</div>
                     <div className="bg-slate-100 border-2 border-slate-400 p-1 text-center font-bold text-lg text-slate-400">22:00</div>
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
