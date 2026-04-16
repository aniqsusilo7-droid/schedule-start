import React, { useState, useEffect } from 'react';
import { Handshake, Clock, Edit3, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
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

interface KesepakatanProps {
    onBack?: () => void;
}

export const Kesepakatan: React.FC<KesepakatanProps> = ({ onBack }) => {
    const DEFAULT_DATA: KesepakatanData = {
        shifts: [
            { name: "SHIFT 1", time: "22:45 - 07:00", closeMode: "22:25", openMode: "21:55" },
            { name: "SHIFT 2", time: "06:45 - 15:00", closeMode: "06:25", openMode: "05:55" },
            { name: "SHIFT", time: "14:45 - 23:00", closeMode: "14:25", openMode: "13:55" }
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
            
            if (!error) {
                if (!silent) setIsEditing(false);
            } else {
                console.error("Error saving kesepakatan:", error);
                if (!silent) alert("Gagal menyimpan data!");
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
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Kesepakatan...</div>
        </div>
    );

    if (!data) return (
        <div className="p-12 text-center">
            <div className="text-red-500 font-black text-2xl uppercase mb-4">Error loading data</div>
            <button onClick={fetchData} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-black uppercase">Retry</button>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 p-6 bg-slate-50 dark:bg-slate-900 min-h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                        <Handshake className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">KESEPAKATAN</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => isEditing ? handleSave(false) : setIsEditing(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black transition-all shadow-sm uppercase text-sm ${isEditing ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {isEditing ? <><Save className="w-4 h-4" /> SELESAI EDIT</> : <><Edit3 className="w-4 h-4" /> EDIT</>}
                    </button>
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-black transition-all shadow-sm uppercase text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" /> KEMBALI
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-[#dcedc8] dark:bg-slate-800 border-2 border-slate-800 overflow-hidden max-w-6xl mx-auto w-full font-sans">
                <div className="grid grid-cols-2 text-center font-black text-5xl lg:text-7xl uppercase tracking-wider border-b-2 border-slate-800">
                    <div className="bg-[#b3e5fc] text-[#0288d1] py-6 border-r-2 border-slate-800">CLOSE MODE</div>
                    <div className="bg-[#b3e5fc] text-[#1565c0] py-6">OPEN MODE</div>
                </div>

                {data.shifts.map((shift, idx) => (
                    <div key={idx} className="flex flex-col border-b-2 border-slate-800 last:border-b-0">
                        <div className="bg-[#c8e6c9] dark:bg-emerald-900/30 py-5 text-center font-bold text-4xl lg:text-5xl text-[#00838f] dark:text-emerald-300 uppercase tracking-wide border-b-2 border-slate-800">
                            {isEditing ? (
                                <div className="flex gap-4 justify-center px-4">
                                    <input value={shift.name} onChange={e => {
                                        const newShifts = [...data.shifts];
                                        newShifts[idx].name = e.target.value;
                                        setData({...data, shifts: newShifts});
                                    }} className="bg-white dark:bg-slate-700 px-4 py-1 rounded border border-slate-400 w-1/3 text-center" />
                                    <input value={shift.time} onChange={e => {
                                        const newShifts = [...data.shifts];
                                        newShifts[idx].time = e.target.value;
                                        setData({...data, shifts: newShifts});
                                    }} className="bg-white dark:bg-slate-700 px-4 py-1 rounded border border-slate-400 w-1/3 text-center" />
                                </div>
                            ) : (
                                `${shift.name} ( ${shift.time} )`
                            )}
                        </div>
                        <div className="grid grid-cols-2 text-center font-bold py-6 bg-[#c8e6c9] dark:bg-slate-800/50">
                            <div className="border-r-2 border-slate-800 flex items-center justify-center gap-4">
                                <span className="text-[#0288d1] dark:text-blue-400 text-4xl lg:text-5xl">START JAM</span>
                                {isEditing ? (
                                    <input value={shift.closeMode} onChange={e => {
                                        const newShifts = [...data.shifts];
                                        newShifts[idx].closeMode = e.target.value;
                                        setData({...data, shifts: newShifts});
                                    }} className="bg-white dark:bg-slate-700 px-4 py-2 rounded border border-slate-400 text-[#0288d1] dark:text-blue-100 text-center w-48 text-4xl" />
                                ) : (
                                    <span className="text-[#0288d1] dark:text-blue-100 text-4xl lg:text-5xl">{shift.closeMode}</span>
                                )}
                            </div>
                            <div className="flex items-center justify-center gap-4">
                                <span className="text-[#1565c0] dark:text-blue-300 text-4xl lg:text-5xl">START JAM</span>
                                {isEditing ? (
                                    <input value={shift.openMode} onChange={e => {
                                        const newShifts = [...data.shifts];
                                        newShifts[idx].openMode = e.target.value;
                                        setData({...data, shifts: newShifts});
                                    }} className="bg-white dark:bg-slate-700 px-4 py-2 rounded border border-slate-400 text-[#1565c0] dark:text-blue-100 text-center w-48 text-4xl" />
                                ) : (
                                    <span className="text-[#1565c0] dark:text-blue-100 text-4xl lg:text-5xl">{shift.openMode}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                <div className="bg-[#b3e5fc] dark:bg-blue-900/20 flex flex-col border-t-2 border-slate-800">
                    {data.additionalNotes.map((note, idx) => (
                        <div key={idx} className="flex items-center justify-center py-5 border-b-2 border-slate-800 last:border-b-0 group">
                            {isEditing ? (
                                <div className="flex w-full px-8 gap-4">
                                    <input value={note} onChange={e => {
                                        const newNotes = [...data.additionalNotes];
                                        newNotes[idx] = e.target.value;
                                        setData({...data, additionalNotes: newNotes});
                                    }} className="flex-1 bg-white dark:bg-slate-700 px-4 py-2 rounded border border-slate-400 font-bold text-[#0277bd] dark:text-blue-300 text-3xl uppercase text-center" />
                                    <button onClick={() => {
                                        const newNotes = data.additionalNotes.filter((_, i) => i !== idx);
                                        setData({...data, additionalNotes: newNotes});
                                    }} className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors">
                                        <Trash2 className="w-8 h-8" />
                                    </button>
                                </div>
                            ) : (
                                <div className="font-bold text-3xl lg:text-4xl text-[#0277bd] dark:text-blue-300 uppercase tracking-wide text-center w-full px-4">
                                    {note}
                                </div>
                            )}
                        </div>
                    ))}
                    {isEditing && (
                        <button onClick={() => setData({...data, additionalNotes: [...data.additionalNotes, "NEW NOTE"]})} className="m-4 py-3 border-2 border-dashed border-blue-400 rounded text-blue-600 font-bold uppercase flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors text-xl">
                            <Plus className="w-6 h-6" /> TAMBAH CATATAN
                        </button>
                    )}
                </div>

                <div className="bg-[#ffeb3b] py-6 text-center border-t-2 border-slate-800">
                    {isEditing ? (
                        <input value={data.footerNote} onChange={e => setData({...data, footerNote: e.target.value})} className="bg-white px-6 py-2 rounded border border-yellow-600 font-black text-4xl text-[#1565c0] uppercase w-3/4 text-center" />
                    ) : (
                        <h2 className="text-4xl lg:text-6xl font-black text-[#1565c0] uppercase tracking-wide">
                            {data.footerNote}
                        </h2>
                    )}
                </div>
            </div>
            
        </div>
    );
};
