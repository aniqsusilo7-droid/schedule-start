import React, { useState, useEffect } from 'react';
import { Handshake, Clock, Edit3, Save, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Shift {
    name: string;
    time: string;
    closeMode: string;
    openMode: string;
}

interface KesepakatanData {
    shifts: Shift[];
    additionalNotes: string[];
    footerNote: string;
}

interface GradeStyle {
    spinner: string;
    headerBg: string;
    editText: string;
    editHover: string;
    shiftBg: string;
    shiftText: string;
    titleInputText: string;
}

const GRADE_THEMES: Record<string, GradeStyle> = {
    SM: {
        spinner: 'border-blue-500',
        headerBg: 'bg-blue-600',
        editText: 'text-blue-700',
        editHover: 'hover:bg-blue-50',
        shiftBg: 'bg-blue-50/50 dark:bg-blue-950/10',
        shiftText: 'text-blue-800 dark:text-blue-300',
        titleInputText: 'text-blue-800 dark:text-white',
    },
    SLK: {
        spinner: 'border-green-600',
        headerBg: 'bg-green-600',
        editText: 'text-green-700',
        editHover: 'hover:bg-green-50',
        shiftBg: 'bg-green-50/50 dark:bg-green-950/10',
        shiftText: 'text-green-800 dark:text-green-300',
        titleInputText: 'text-green-800 dark:text-white',
    },
    SLP: {
        spinner: 'border-orange-500',
        headerBg: 'bg-orange-500',
        editText: 'text-orange-700',
        editHover: 'hover:bg-orange-50',
        shiftBg: 'bg-orange-50/50 dark:bg-orange-950/10',
        shiftText: 'text-orange-800 dark:text-orange-300',
        titleInputText: 'text-orange-800 dark:text-white',
    },
    SE: {
        spinner: 'border-purple-600',
        headerBg: 'bg-purple-600',
        editText: 'text-purple-700',
        editHover: 'hover:bg-purple-50',
        shiftBg: 'bg-purple-50/50 dark:bg-purple-950/10',
        shiftText: 'text-purple-800 dark:text-purple-300',
        titleInputText: 'text-purple-800 dark:text-white',
    },
    SR: {
        spinner: 'border-red-600',
        headerBg: 'bg-red-600',
        editText: 'text-red-700',
        editHover: 'hover:bg-red-50',
        shiftBg: 'bg-red-50/50 dark:bg-red-950/10',
        shiftText: 'text-red-800 dark:text-red-300',
        titleInputText: 'text-red-800 dark:text-white',
    },
};

const DEFAULT_THEME: GradeStyle = {
    spinner: 'border-emerald-500',
    headerBg: 'bg-emerald-600',
    editText: 'text-emerald-700',
    editHover: 'hover:bg-emerald-50',
    shiftBg: 'bg-emerald-50/50 dark:bg-emerald-950/10',
    shiftText: 'text-emerald-800 dark:text-emerald-300',
    titleInputText: 'text-emerald-800 dark:text-white',
};

interface KesepakatanProps {
    onBack?: () => void; // kept for compatibility, but we won't need it if it's always inline
    currentGrade?: string;
}

export const Kesepakatan: React.FC<KesepakatanProps> = ({ currentGrade }) => {
    const theme = (currentGrade && GRADE_THEMES[currentGrade]) || DEFAULT_THEME;
    const DEFAULT_DATA: KesepakatanData = {
        shifts: [
            { name: "SHIFT 1", time: "22:45 - 07:00", closeMode: "22:25", openMode: "21:55" },
            { name: "SHIFT 2", time: "06:45 - 15:00", closeMode: "06:25", openMode: "05:55" },
            { name: "SHIFT 3", time: "14:45 - 23:00", closeMode: "14:25", openMode: "13:55" }
        ],
        additionalNotes: [
            "DEMONOMER F LINE WASHING Pertama >= JAM 06:25 , 14:25 , 22:25",
            "SAMPLE SA DISSOLUTION COMPLETE >= JAM 22:25",
            "SILO CHARGE COMPLETTE >= JAM 6:25 , 14:25 , 22:25"
        ],
        footerNote: "TANGGUNG JAWAB SHIFT YANG BARU DATANG"
    };

    const [data, setData] = useState<KesepakatanData>(DEFAULT_DATA);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: dbData, error } = await supabase
                .from('kesepakatan')
                .select('data')
                .single();
            
            if (dbData && dbData.data) {
                setData(dbData.data);
            } else if (error) {
                console.error("Error fetching kesepakatan:", error);
                setData(DEFAULT_DATA);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setData(DEFAULT_DATA);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (silent = false) => {
        if (!data) return;
        try {
            const { error } = await supabase
                .from('kesepakatan')
                .update({ data, updated_at: new Date() })
                .eq('id', 1);
            
            if (error) {
                console.error("Error saving kesepakatan:", error);
                if (!silent) alert("Gagal menyimpan data!");
            } else {
                if (!silent) setIsEditing(false);
            }
        } catch (err) {
            console.error("Save error:", err);
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (!isEditing || isLoading || !data) return;
        
        const timer = setTimeout(() => {
            handleSave(true);
        }, 1000); // Auto-save after 1 second of inactivity
        
        return () => clearTimeout(timer);
    }, [data, isEditing, isLoading]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className={`w-8 h-8 border-4 ${theme.spinner} border-t-transparent rounded-full animate-spin`}></div>
            <div className="text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">Loading Kesepakatan...</div>
        </div>
    );

    if (!data) return (
        <div className="p-6 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-red-500 font-black text-lg uppercase mb-2">Error loading data</div>
            <button onClick={fetchData} className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-black uppercase text-xs">Retry</button>
        </div>
    );

    return (
        <div className="flex flex-col shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            {/* Widget Header */}
            <div className={`${theme.headerBg} text-white font-bold text-[0.91em] px-3 py-1 text-center flex items-center justify-between gap-2 uppercase tracking-tight transition-colors`}>
                <div className="flex items-center gap-1.5">
                    <Handshake className="w-3.5 h-3.5" />
                    KESEPAKATAN SHIFT
                </div>
                <button 
                    onClick={() => isEditing ? handleSave(false) : setIsEditing(true)}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-black uppercase text-[1.1em] transition-all ${isEditing ? `bg-white ${theme.editText} ${theme.editHover}` : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                    {isEditing ? 'SELESAI' : 'EDIT'}
                </button>
            </div>

            {/* Widget Body */}
            <div className="p-1.5 flex flex-col gap-1.5 overflow-hidden">
                {/* Close & Open Modes Column Titles */}
                <div className="grid grid-cols-2 text-center font-black text-[0.91em] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <div className="bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 py-1 border-r border-slate-200 dark:border-slate-700 rounded-tl-md">CLOSE MODE</div>
                    <div className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 py-1 rounded-tr-md">OPEN MODE</div>
                </div>

                {/* Shifts List */}
                <div className="flex flex-col gap-1 border border-slate-150 dark:border-slate-700/50 rounded-lg overflow-hidden">
                    {data.shifts.map((shift, idx) => (
                        <div key={idx} className="flex flex-col border-b border-slate-150 dark:border-slate-700/50 last:border-0">
                            {/* Shift Title Block */}
                            <div className={`${theme.shiftBg} py-1.5 text-center font-bold text-[0.98em] ${theme.shiftText} uppercase tracking-wide border-b border-slate-150 dark:border-slate-700/50 transition-colors`}>
                                {isEditing ? (
                                    <div className="flex gap-2 justify-center px-2">
                                        <input 
                                            value={shift.name} 
                                            onChange={e => {
                                                const newShifts = [...data.shifts];
                                                newShifts[idx].name = e.target.value;
                                                setData({...data, shifts: newShifts});
                                            }} 
                                            className={`bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 w-1/3 text-center text-[0.98rem] font-black ${theme.titleInputText}`} 
                                        />
                                        <input 
                                            value={shift.time} 
                                            onChange={e => {
                                                const newShifts = [...data.shifts];
                                                newShifts[idx].time = e.target.value;
                                                setData({...data, shifts: newShifts});
                                            }} 
                                            className={`bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 w-1/3 text-center text-[0.98rem] font-black ${theme.titleInputText}`} 
                                        />
                                    </div>
                                ) : (
                                    `${shift.name} ( ${shift.time} )`
                                )}
                            </div>

                            {/* Start Times Grid */}
                            <div className="grid grid-cols-2 text-center py-1.5 bg-white dark:bg-slate-800">
                                {/* Close Mode Column */}
                                <div className="border-r border-slate-150 dark:border-slate-700/50 flex items-center justify-center gap-1.5 px-1">
                                    <span className="text-[#0288d1] dark:text-sky-400 font-bold text-[0.98em]">START</span>
                                    {isEditing ? (
                                        <input 
                                            value={shift.closeMode} 
                                            onChange={e => {
                                                const newShifts = [...data.shifts];
                                                newShifts[idx].closeMode = e.target.value;
                                                setData({...data, shifts: newShifts});
                                            }} 
                                            className="bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-[#0288d1] dark:text-sky-200 text-center w-28 font-black text-[1.5em] outline-none focus:ring-1 focus:ring-sky-500" 
                                        />
                                    ) : (
                                        <span className="text-[#0288d1] dark:text-sky-200 font-black text-[1.5em]">{shift.closeMode}</span>
                                    )}
                                </div>

                                {/* Open Mode Column */}
                                <div className="flex items-center justify-center gap-1.5 px-1">
                                    <span className="text-[#1565c0] dark:text-blue-400 font-bold text-[0.98em]">START</span>
                                    {isEditing ? (
                                        <input 
                                            value={shift.openMode} 
                                            onChange={e => {
                                                const newShifts = [...data.shifts];
                                                newShifts[idx].openMode = e.target.value;
                                                setData({...data, shifts: newShifts});
                                            }} 
                                            className="bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-[#1565c0] dark:text-blue-200 text-center w-28 font-black text-[1.5em] outline-none focus:ring-1 focus:ring-blue-500" 
                                        />
                                    ) : (
                                        <span className="text-[#1565c0] dark:text-blue-200 font-black text-[1.5em]">{shift.openMode}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Additional Notes Box */}
                <div className="bg-sky-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-700 rounded-lg p-1.5 flex flex-col gap-1">
                    {data.additionalNotes.map((note, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-1 rounded hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors">
                            {isEditing ? (
                                <div className="flex w-full items-center gap-1.5">
                                    <input 
                                        value={note} 
                                        onChange={e => {
                                            const newNotes = [...data.additionalNotes];
                                            newNotes[idx] = e.target.value;
                                            setData({...data, additionalNotes: newNotes});
                                        }} 
                                        className="flex-1 bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-[0.98rem] font-bold text-sky-800 dark:text-sky-300 uppercase" 
                                    />
                                    <button 
                                        onClick={() => {
                                            const newNotes = data.additionalNotes.filter((_, i) => i !== idx);
                                            setData({...data, additionalNotes: newNotes});
                                        }} 
                                        className="p-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="font-bold text-[0.98em] text-sky-800 dark:text-sky-300 uppercase tracking-wide leading-tight flex items-start gap-1.5">
                                    <span className="text-sky-500 dark:text-sky-400 mt-0.5">•</span>
                                    <span>{note}</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {isEditing && (
                        <button 
                            onClick={() => setData({...data, additionalNotes: [...data.additionalNotes, "CATATAN BARU"]})} 
                            className="py-1.5 border border-dashed border-sky-400 dark:border-sky-700 rounded text-sky-600 dark:text-sky-400 font-bold uppercase flex items-center justify-center gap-1 hover:bg-sky-50 dark:hover:bg-sky-950/20 transition-colors text-[0.91em]"
                        >
                            <Plus className="w-3.5 h-3.5" /> TAMBAH CATATAN
                        </button>
                    )}
                </div>

                {/* Footer Yellow Banner */}
                <div className="bg-yellow-400 dark:bg-yellow-500 text-[#1565c0] py-2 px-3 rounded-lg text-center font-black text-[1.04em] tracking-wide uppercase border border-yellow-500/20 shadow-inner flex justify-center items-center">
                    {isEditing ? (
                        <input 
                            value={data.footerNote} 
                            onChange={e => setData({...data, footerNote: e.target.value})} 
                            className="bg-white text-slate-800 px-3 py-1 rounded border border-yellow-600 font-bold text-[0.98rem] uppercase w-full text-center" 
                        />
                    ) : (
                        data.footerNote
                    )}
                </div>
            </div>
        </div>
    );
};
