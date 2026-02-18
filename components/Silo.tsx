import React from 'react';
import { Database, Save } from 'lucide-react';

export const Silo: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-mono animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-600 rounded-xl text-white shadow-lg">
                <Database className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">SILO MONITOR</h2>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-wider">O - P - Q Control</p>
            </div>
          </div>
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-xs font-bold border border-yellow-200">
             LOGIC PENDING
          </div>
      </div>

      <div className="bg-slate-200 border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(30,41,59,0.2)] overflow-hidden rounded-xl max-w-5xl">
        
        {/* Main Grid: Labels + 3 Silos */}
        <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-[2px] bg-slate-800 border-b-[2px] border-slate-800">
            
            {/* Header Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center font-black text-lg">SILO</div>
            <div className="bg-black text-white p-2 flex items-center justify-center font-black text-2xl tracking-widest">O</div>
            <div className="bg-black text-white p-2 flex items-center justify-center font-black text-2xl tracking-widest">P</div>
            <div className="bg-black text-white p-2 flex items-center justify-center font-black text-2xl tracking-widest">Q</div>

            {/* Lot Number Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center text-xs font-black uppercase text-center leading-tight">LOT NUMBER</div>
            <div className="bg-slate-100 p-2 flex items-center justify-center font-bold text-red-600 text-xl">E5ZB16</div>
            <div className="bg-emerald-500 p-2 flex items-center justify-center font-bold text-white text-xl">E5ZB17</div>
            <div className="bg-slate-100 p-2 flex items-center justify-center font-bold text-black text-xl">E5ZB15</div>

            {/* Set Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center text-xs font-black uppercase">SET</div>
            <div className="bg-slate-100 p-2 flex items-center justify-between px-6 font-bold text-red-600 text-xl">
                <span>270</span> <span className="text-sm text-black">T</span>
            </div>
            <div className="bg-emerald-500 p-2 flex items-center justify-between px-6 font-bold text-white text-xl">
                <span>270</span> <span className="text-sm text-white">T</span>
            </div>
             <div className="bg-slate-100 p-2 flex items-center justify-between px-6 font-bold text-black text-xl">
                <span>270</span> <span className="text-sm text-black">T</span>
            </div>

            {/* Start Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center text-xs font-black uppercase">START</div>
            <div className="bg-slate-50 p-2 flex items-center justify-center font-bold text-black text-xl">01:01</div>
            <div className="bg-emerald-500 p-2 flex items-center justify-center font-bold text-white text-xl">12:50</div>
            <div className="bg-slate-50 p-2 flex items-center justify-center font-bold text-black text-xl">14:59</div>

             {/* Finish Row */}
            <div className="bg-cyan-200 p-2 flex items-center justify-center text-xs font-black uppercase">FINISH</div>
            <div className="bg-slate-50 p-2 flex items-center justify-center font-bold text-red-600 text-xl">12:50</div>
            <div className="bg-emerald-500 p-2 flex items-center justify-center font-bold text-white text-xl"></div>
            <div className="bg-slate-50 p-2 flex items-center justify-center font-bold text-black text-xl">01:01</div>
        </div>

        {/* Update Section */}
        <div className="grid grid-cols-[140px_1fr] bg-slate-800 gap-[2px]">
            {/* Left Label */}
             <div className="bg-cyan-200 flex flex-col items-center justify-center gap-4 py-2">
                 <div className="text-xs font-black bg-white/50 w-full text-center py-1">UPDATE</div>
                 
                 <div className="flex flex-col gap-6 w-full px-2">
                     <div className="bg-slate-100 border-2 border-slate-400 p-1 text-center font-bold text-lg">06:00</div>
                     <div className="bg-slate-100 border-2 border-slate-400 p-1 text-center font-bold text-lg">14:00</div>
                     <div className="bg-slate-100 border-2 border-slate-400 p-1 text-center font-bold text-lg">22:00</div>
                 </div>
             </div>

             {/* Matrix of updates */}
             <div className="grid grid-cols-3 gap-[2px] bg-slate-800">
                {/* Silo O Col */}
                <div className="flex flex-col gap-[2px]">
                     <UpdateRow val="39" total="117.0" />
                     <UpdateRow val="" total="" isEmpty />
                     <UpdateRow val="52.5" total="157.5" />
                </div>
                {/* Silo P Col */}
                <div className="flex flex-col gap-[2px]">
                     <UpdateRow val="" total="0.0" isEmpty />
                     <UpdateRow val="###" total="270.0" isHash />
                     <UpdateRow val="###" total="193.8" isHash />
                </div>
                 {/* Silo Q Col */}
                <div className="flex flex-col gap-[2px]">
                     <UpdateRow val="42" total="126.0" />
                     <UpdateRow val="##" total="279.9" isHash />
                     <UpdateRow val="##" total="174.3" isHash />
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};

// Helper for the update rows
const UpdateRow = ({val, total, isEmpty, isHash}: {val: string, total: string, isEmpty?: boolean, isHash?: boolean}) => (
    <div className="bg-slate-50 h-[64px] flex items-center border border-slate-200">
        <div className={`w-16 h-full flex items-center justify-center font-bold text-xl border-r border-slate-300 ${!isEmpty ? 'bg-yellow-300' : ''}`}>
            {val}
        </div>
        <div className="w-8 h-full flex items-center justify-center font-bold text-slate-500 text-sm border-r border-slate-300 bg-slate-100">
            %
        </div>
        <div className="flex-1 h-full flex items-center justify-between px-2 font-bold text-lg">
             <span>{total}</span>
             <span className="text-slate-400 text-sm">T</span>
        </div>
    </div>
);