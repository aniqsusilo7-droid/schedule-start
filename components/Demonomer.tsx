import React from 'react';
import { ArrowRight, Settings2, Activity } from 'lucide-react';

export const Demonomer: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto font-mono animate-in fade-in duration-500">
      
      <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-teal-600 rounded-xl text-white shadow-lg">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">DEMONOMER MONITOR</h2>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-wider">Real-time Parameter Tracking</p>
          </div>
      </div>

      <div className="bg-white border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(30,41,59,0.2)] overflow-hidden rounded-xl">
        
        {/* Header Row */}
        <div className="grid grid-cols-5 border-b-4 border-slate-800 bg-[#FFF8DC]">
          <div className="p-4 border-r-2 border-slate-800 font-black text-center text-xl text-slate-800 tracking-tight">F2002</div>
          <div className="p-4 border-r-2 border-slate-800 font-black text-center text-xl text-slate-800 tracking-tight">AI2802</div>
          <div className="p-4 border-r-2 border-slate-800 font-black text-center text-xl text-slate-800 tracking-tight">zPVC</div>
          <div className="p-4 border-r-2 border-slate-800 font-black text-center text-xl text-slate-800 tracking-tight">PVC</div>
          <div className="p-4 font-black text-center text-xl text-slate-800 tracking-tight">Steam</div>
        </div>

        {/* Value Row */}
        <div className="grid grid-cols-5 border-b-4 border-slate-800 bg-white min-h-[100px]">
          {/* F2002 Input */}
          <div className="p-2 border-r-2 border-slate-800 flex items-center justify-center bg-white relative group">
            <div className="relative w-full max-w-[120px]">
                <select className="w-full appearance-none border-2 border-slate-300 group-hover:border-teal-500 font-black text-3xl text-center py-2 rounded bg-slate-50 focus:outline-none focus:ring-4 focus:ring-teal-100 transition-all cursor-pointer">
                    <option>128</option>
                    <option>129</option>
                    <option>130</option>
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                    ▼
                </div>
            </div>
          </div>
          
          {/* AI2802 */}
          <div className="p-2 border-r-2 border-slate-800 flex items-center justify-center">
            <span className="text-4xl font-black tracking-tighter text-slate-800">1053</span>
          </div>

          {/* zPVC */}
          <div className="p-2 border-r-2 border-slate-800 flex items-center justify-center">
             <span className="text-4xl font-black tracking-tighter text-slate-800">***</span>
          </div>

          {/* PVC */}
          <div className="p-2 border-r-2 border-slate-800 flex items-center justify-center">
             <span className="text-4xl font-black tracking-tighter text-slate-800">33.696</span>
          </div>

          {/* Steam - Complex Cell */}
          <div className="p-2 flex items-center justify-center relative bg-white overflow-hidden">
             <div className="absolute inset-0 opacity-5 bg-red-100"></div>
             <span className="text-6xl font-black text-red-600 tracking-tighter drop-shadow-sm z-10">4010</span>
             <span className="absolute top-2 right-3 text-lg font-bold text-cyan-600 font-mono">33</span>
             <span className="absolute bottom-2 right-3 text-lg font-bold text-cyan-600 font-mono">116</span>
          </div>
        </div>

        {/* List Section - Replicating the yellow area */}
        <div className="bg-[#FFFACD] p-8 space-y-4 min-h-[350px]">
            
            {/* Item 1 */}
            <div className="flex items-center group cursor-pointer transform transition-all hover:translate-x-1">
                <div className="w-10 flex justify-center">
                    <ArrowRight className="w-6 h-6 text-teal-700" />
                </div>
                <div className="bg-[#EEE8AA] group-hover:bg-[#F0E68C] pl-6 pr-8 py-2 min-w-[140px] flex justify-between items-center shadow-sm transition-colors border-l-8 border-teal-600 rounded-r-lg">
                    <span className="text-3xl font-black text-teal-900">SM</span>
                    <span className="text-3xl font-bold text-teal-700 font-mono">119</span>
                </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-center group cursor-pointer transform transition-all hover:translate-x-1 opacity-70 hover:opacity-100">
                <div className="w-10 flex justify-center">
                    <ArrowRight className="w-6 h-6 text-teal-700 opacity-30 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="bg-transparent pl-6 pr-8 py-2 min-w-[140px] flex justify-between items-center border-l-8 border-transparent group-hover:border-teal-300 transition-all rounded-r-lg">
                     <span className="text-3xl font-black text-teal-800">SLP</span>
                     <span className="text-3xl font-bold text-teal-700 font-mono">111</span>
                </div>
            </div>

            {/* Item 3 - Chained */}
             <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center transform transition-all hover:scale-105 cursor-pointer">
                    <div className="w-10 flex justify-center">
                        <ArrowRight className="w-6 h-6 text-teal-700" />
                    </div>
                    <div className="bg-[#EEE8AA] pl-6 pr-8 py-2 min-w-[140px] flex justify-between items-center shadow-lg border-l-8 border-teal-600 rounded-r-lg ring-2 ring-white">
                        <span className="text-3xl font-black text-teal-900">SLK</span>
                        <span className="text-3xl font-bold text-teal-700 font-mono">130</span>
                    </div>
                </div>

                <div className="flex items-center opacity-60">
                     <div className="w-10 flex justify-center">
                        <ArrowRight className="w-6 h-6 text-teal-700" />
                    </div>
                     <div className="bg-transparent px-2 py-1 flex items-center gap-4">
                        <span className="text-3xl font-black text-teal-800">SE</span>
                        <span className="text-3xl font-bold text-teal-700 font-mono">140</span>
                    </div>
                </div>
            </div>

        </div>
      </div>

       {/* Placeholder Logic Note */}
       <div className="mt-8 bg-slate-100 border-2 border-slate-200 border-dashed p-6 rounded-xl flex items-center gap-6 opacity-80">
            <div className="p-3 bg-slate-200 rounded-full">
                 <Settings2 className="w-8 h-8 text-slate-500" />
            </div>
            <div className="text-slate-600">
                <h4 className="font-black text-lg uppercase mb-1">Logic Module Pending</h4>
                <p className="text-sm font-medium">
                    This interface is a visual representation based on the requested design (F2002/AI2802). 
                    Live data connection and sequence logic will be implemented in the next phase.
                </p>
            </div>
       </div>

    </div>
  );
};