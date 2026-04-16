import React, { useState, useEffect } from 'react';
import { FileText, Tag, Info, LayoutGrid, ArrowLeft, Edit3, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface CatatanProps {
    onBack?: () => void;
}

export const Catatan: React.FC<CatatanProps> = ({ onBack }) => {
    const DEFAULT_MASTER_REFERENCE = [
        {"type": "EBD", "s": "09076 [01 - 04]", "t": "09106", "u": "09136", "v": "09166", "w": "09196", "demo": "1004101<br/>10041 [12 - 14]", "dry": "10082 [01 - 07]", "rec": "10116 [01 - 03]", "silo": "1015", "sa": "09023 [01 - 06]", "util": ""},
        {"type": "ESF", "s": "09067<br/>09068<br/>09069<br/>09070", "t": "09097<br/>09098<br/>09099<br/>09100", "u": "09127<br/>09128<br/>09129<br/>09130", "v": "09157<br/>09158<br/>09159<br/>09160", "w": "09187<br/>09188<br/>09189<br/>09190", "demo": "10027 [01 - 18]<br/><br/>1002733", "dry": "10067 [01 - 27]<br/><br/>10068 [01 - 18]<br/><span class=\"text-[24px] text-slate-800 font-bold\">2,4,5&10 tdk ada</span>", "rec": "10108 [01-31]", "silo": "1014", "sa": "09020 [01 - 10]", "util": ""},
        {"type": "TIMER", "s": "09077<br/>09078<br/>09079<br/>09080", "t": "09107<br/>09108<br/>09109<br/>09110", "u": "09137<br/>09138<br/>09139<br/>09140", "v": "09167<br/>09168<br/>09169<br/>09170", "w": "09197<br/>09198<br/>09199<br/>09200", "demo": "10043", "dry": "10083", "rec": "10118", "silo": "10152", "sa": "9024", "util": ""},
        {"type": "ELC", "s": "09071<br/>09072<br/>09073", "t": "09101<br/>09102<br/>09103", "u": "09131<br/>09132<br/>09133", "v": "09161<br/>09162<br/>09163", "w": "09191<br/>09192<br/>09193", "demo": "10026<br/>10028", "dry": "10066<br/>10067<br/>10068<br/>10070", "rec": "10106<br/>10108<br/>10110", "silo": "10141<br/>10142<br/>10143", "sa": "09019", "util": "10181<br/>10183<br/>10186"}
    ];

    const DEFAULT_SPECIAL_NOTES = [
        {"cat": "RE-S grade", "code": "EBD0907626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-T grade", "code": "EBD0910626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-U grade", "code": "EBD0913626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-V grade", "code": "EBD0916626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-W grade", "code": "EBD0919626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "Drying Grade", "code": "EBD1019110.DT06", "bold": true, "color": "bg-white/80"},
        {"cat": "Blowdown A", "code": "EBD1019110.DT07"},
        {"cat": "Blowdown B", "code": "EBD1019110.DT08"},
        {"cat": "Slurry Tank", "code": "EBD1019110.DT09"},
        {"cat": "Silo O Grade", "code": "EBD1019110.DT10"},
        {"cat": "Silo P Grade", "code": "EBD1019110.DT11"},
        {"cat": "Silo Q Grade", "code": "EBD1019110.DT12"},
        {"cat": "LOT NUMBER DI PI", "code": "EBD1015111.NX01"},
        {"cat": "LOT NUMBER DI SILO", "code": "EBD1015111.NX02<br/>EBD1015111.NX03<br/>EBD1015111.NX04"}
    ];

    const DEFAULT_GRADE_CONTROL = [
        {"code": "ESF0907201", "desc": "E-PO GRADE MATCHFOR BL"},
        {"code": "ESF1018222", "desc": "GRADE CTRL RE-S"},
        {"code": "ESF1018223", "desc": "GRADE CTRL RE-T"},
        {"code": "ESF1018224", "desc": "GRADE CTRL RE-U"},
        {"code": "ESF1018225", "desc": "GRADE CTRL RE-V"},
        {"code": "ESF1018226", "desc": "GRADE CTRL RE-W"},
        {"code": "ESF1018227", "desc": "GRADE CTRL VE-E118A"},
        {"code": "ESF1018228", "desc": "GRADE CTRL VE-E118B"},
        {"code": "ESF1018229", "desc": "GRADE CTRL DEMONOMER"},
        {"code": "ESF1018230", "desc": "GRADE CTRL VE-E202"},
        {"code": "ESF1018231", "desc": "GRADE CTRL DRYING"},
        {"code": "ESF1018232", "desc": "GRADE CTRL SILO O"},
        {"code": "ESF1018233", "desc": "GRADE CTRL SILO P"},
        {"code": "ESF1018234", "desc": "GRADE CTRL SILO Q"},
        {"code": "ECT0907703", "desc": "WASH CT"}
    ];

    const [gradeControl, setGradeControl] = useState<any[]>(DEFAULT_GRADE_CONTROL);
    const [specialNotes, setSpecialNotes] = useState<any[]>(DEFAULT_SPECIAL_NOTES);
    const [masterReference, setMasterReference] = useState<any[]>(DEFAULT_MASTER_REFERENCE);
    const [reactorNotes, setReactorNotes] = useState<Record<string, string>>({
        'S': '', 'T': '', 'U': '', 'V': '', 'W': ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Catatan Data
            const { data, error } = await supabase
                .from('catatan_data')
                .select('*')
                .single();
            
            if (data) {
                setGradeControl(data.grade_control || DEFAULT_GRADE_CONTROL);
                setSpecialNotes(data.special_notes || DEFAULT_SPECIAL_NOTES);
                setMasterReference(data.master_reference || DEFAULT_MASTER_REFERENCE);
            }

            // 2. Fetch Reactor Notes
            const { data: notesData } = await supabase
                .from('reactor_notes')
                .select('*');
            
            if (notesData) {
                const notesMap: Record<string, string> = { 'S': '', 'T': '', 'U': '', 'V': '', 'W': '' };
                notesData.forEach((row: any) => {
                    notesMap[row.reactor_id] = row.note;
                });
                setReactorNotes(notesMap);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (silent = false) => {
        try {
            // 1. Save Catatan Data
            const { error: catatanError } = await supabase
                .from('catatan_data')
                .update({
                    grade_control: gradeControl,
                    special_notes: specialNotes,
                    master_reference: masterReference,
                    updated_at: new Date()
                })
                .eq('id', 1);
            
            // 2. Save Reactor Notes
            const notesPromises = Object.entries(reactorNotes).map(([reactor_id, note]) => 
                supabase.from('reactor_notes').upsert({ 
                    reactor_id, 
                    note, 
                    updated_at: new Date() 
                })
            );
            await Promise.all(notesPromises);

            if (!catatanError) {
                if (!silent) setIsEditing(false);
            } else {
                console.error("Error saving catatan:", catatanError);
                if (!silent) alert("Gagal menyimpan data!");
            }
        } catch (err) {
            console.error("Save error:", err);
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (!isEditing || isLoading) return;
        
        const timer = setTimeout(() => {
            handleSave(true);
        }, 1000); // Auto-save after 1 second of inactivity
        
        return () => clearTimeout(timer);
    }, [gradeControl, specialNotes, masterReference, reactorNotes, isEditing, isLoading]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Catatan...</div>
        </div>
    );

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-full animate-in fade-in duration-500 max-w-[1600px] mx-auto font-sans">
            {/* Header Section - Demonomer Style */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl text-white shadow-xl shadow-blue-500/20">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">CATATAN</h1>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => isEditing ? handleSave(false) : setIsEditing(true)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all shadow-lg uppercase text-sm tracking-widest ${isEditing ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
                    >
                        {isEditing ? <><Save className="w-5 h-5" /> SELESAI EDIT</> : <><Edit3 className="w-5 h-5" /> EDIT DATA</>}
                    </button>
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-black transition-all shadow-md border border-slate-200 dark:border-slate-700 uppercase text-sm tracking-widest"
                        >
                            <ArrowLeft className="w-5 h-5" /> KEMBALI
                        </button>
                    )}
                </div>
            </div>

            {/* 1. MASTER REFERENCE TABLE - IMAGE STYLE */}
            <div className="flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-blue-600 text-white p-5 flex items-center gap-3 font-black uppercase tracking-[0.2em] text-4xl">
                    <LayoutGrid className="w-10 h-10" /> CATATAN EBD , ETM ,ESF ,ELC
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-center">
                        <thead>
                            <tr className="text-slate-800 dark:text-slate-200">
                                <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-4 font-black uppercase bg-slate-100 dark:bg-slate-800 text-[1.75em] w-[4%]"></th>
                                <th colSpan={5} className="border border-slate-300 dark:border-slate-700 p-4 font-black uppercase bg-[#81d4fa] text-blue-900 tracking-widest text-[1.85em]">POLYMER</th>
                                <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-4 font-black uppercase bg-[#81d4fa] text-blue-900 text-[1.85em] w-[8%]">DEMO</th>
                                <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-4 font-black uppercase bg-[#c8e6c9] text-green-900 text-[1.85em] w-[8%]">DRYING</th>
                                <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-4 font-black uppercase bg-[#b2ebf2] text-cyan-900 text-[1.85em] w-[8%]">RECOVERY</th>
                                <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-4 font-black uppercase bg-[#e1f5fe] text-blue-900 text-[1.85em] w-[8%]">SILO</th>
                                <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-4 font-black uppercase bg-[#cfd8dc] text-slate-900 text-[1.85em] w-[8%]">SA</th>
                                <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-4 font-black uppercase bg-[#b3e5fc] text-blue-900 text-[1.85em] w-[8%]">UTILITY</th>
                            </tr>
                            <tr className="text-slate-500">
                                <th className="border border-slate-300 dark:border-slate-700 p-4 font-black bg-red-500 text-white text-[1.85em] w-[8%]">S</th>
                                <th className="border border-slate-300 dark:border-slate-700 p-4 font-black bg-orange-500 text-white text-[1.85em] w-[8%]">T</th>
                                <th className="border border-slate-300 dark:border-slate-700 p-4 font-black bg-yellow-400 text-yellow-900 text-[1.85em] w-[8%]">U</th>
                                <th className="border border-slate-300 dark:border-slate-700 p-4 font-black bg-green-500 text-white text-[1.85em] w-[8%]">V</th>
                                <th className="border border-slate-300 dark:border-slate-700 p-4 font-black bg-blue-500 text-white text-[1.85em] w-[8%]">W</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-800 dark:text-slate-200">
                            {masterReference.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="border border-slate-300 dark:border-slate-700 p-4 font-black bg-slate-50 dark:bg-slate-800/80 text-[2.05em]">
                                        {isEditing ? <input value={row.type} onChange={e => {
                                            const newData = [...masterReference];
                                            newData[i].type = e.target.value;
                                            setMasterReference(newData);
                                        }} className="w-full bg-transparent text-center font-black outline-none" /> : row.type}
                                    </td>
                                    {['s', 't', 'u', 'v', 'w'].map(key => (
                                        <td key={key} className={`border border-slate-300 dark:border-slate-700 p-4 text-[1.75em] font-bold leading-tight ${key === 's' ? 'bg-red-500/10' : key === 't' ? 'bg-orange-500/10' : key === 'u' ? 'bg-yellow-400/10' : key === 'v' ? 'bg-green-500/10' : key === 'w' ? 'bg-blue-500/10' : ''}`}>
                                            {isEditing ? (
                                                <textarea value={row[key]} onChange={e => {
                                                    const newData = [...masterReference];
                                                    newData[i][key] = e.target.value;
                                                    setMasterReference(newData);
                                                }} className="w-full bg-transparent text-center font-bold outline-none resize-none" rows={3} />
                                            ) : (
                                                <div className="leading-tight break-words" dangerouslySetInnerHTML={{ __html: row[key] }} />
                                            )}
                                        </td>
                                    ))}
                                    {['demo', 'dry', 'rec', 'silo', 'sa', 'util'].map(key => (
                                        <td key={key} className={`border border-slate-300 dark:border-slate-700 p-4 text-[1.75em] font-bold leading-tight ${key === 'demo' ? 'bg-[#81d4fa]/10' : key === 'dry' ? 'bg-[#c8e6c9]/10' : key === 'rec' ? 'bg-[#b2ebf2]/10' : key === 'silo' ? 'bg-[#e1f5fe]/10' : key === 'sa' ? 'bg-[#cfd8dc]/10' : key === 'util' ? 'bg-[#b3e5fc]/10' : ''}`}>
                                            {isEditing ? (
                                                <textarea value={row[key]} onChange={e => {
                                                    const newData = [...masterReference];
                                                    newData[i][key] = e.target.value;
                                                    setMasterReference(newData);
                                                }} className="w-full bg-transparent text-center font-bold outline-none resize-none" rows={3} />
                                            ) : (
                                                <div className="leading-tight break-words" dangerouslySetInnerHTML={{ __html: row[key] }} />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 2. SPECIAL NOTES TABLE */}
                <div className="flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="bg-[#4db6ac] p-5 flex items-center justify-between text-white font-black uppercase tracking-[0.2em] text-4xl">
                        <div className="flex items-center gap-3">
                            <Info className="w-10 h-10" /> SPECIAL NOTES :
                        </div>
                        {isEditing && (
                            <button onClick={() => setSpecialNotes([...specialNotes, {cat: '', code: ''}])} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><Plus className="w-5 h-5" /></button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {specialNotes.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 text-[1.9em] uppercase border-r border-slate-100 dark:border-slate-800 bg-[#e0f2f1]/30 dark:bg-teal-900/10 w-1/2">
                                            {isEditing ? <input value={row.cat} onChange={e => {
                                                const newData = [...specialNotes];
                                                newData[i].cat = e.target.value;
                                                setSpecialNotes(newData);
                                            }} className="w-full bg-transparent outline-none italic" /> : row.cat}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-black text-slate-900 dark:text-white text-[2.2em]">
                                            {isEditing ? <input value={row.code} onChange={e => {
                                                const newData = [...specialNotes];
                                                newData[i].code = e.target.value;
                                                setSpecialNotes(newData);
                                            }} className="w-full bg-transparent outline-none" /> : <div className="leading-tight" dangerouslySetInnerHTML={{ __html: row.code }} />}
                                        </td>
                                        {isEditing && (
                                            <td className="px-4">
                                                <button onClick={() => setSpecialNotes(specialNotes.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5" /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. GRADE CONTROL TABLE */}
                <div className="flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="bg-[#03a9f4] p-5 flex items-center justify-between text-white font-black uppercase tracking-[0.2em] text-4xl">
                        <div className="flex items-center gap-3">
                            <Tag className="w-10 h-10" /> GRADE CONTROL
                        </div>
                        {isEditing && (
                            <button onClick={() => setGradeControl([...gradeControl, {code: '', desc: ''}])} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><Plus className="w-5 h-5" /></button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {gradeControl.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4 font-mono font-black text-blue-700 dark:text-blue-400 text-[2.2em] border-r border-slate-100 dark:border-slate-800 bg-[#e1f5fe]/30 dark:bg-blue-900/10 w-2/5">
                                            {isEditing ? <input value={row.code} onChange={e => {
                                                const newData = [...gradeControl];
                                                newData[i].code = e.target.value;
                                                setGradeControl(newData);
                                            }} className="w-full bg-transparent outline-none" /> : row.code}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 text-[1.9em] uppercase tracking-tight">
                                            {isEditing ? <input value={row.desc} onChange={e => {
                                                const newData = [...gradeControl];
                                                newData[i].desc = e.target.value;
                                                setGradeControl(newData);
                                            }} className="w-full bg-transparent outline-none" /> : row.desc}
                                        </td>
                                        {isEditing && (
                                            <td className="px-4">
                                                <button onClick={() => setGradeControl(gradeControl.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5" /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4. REACTOR NOTES (Existing Table Connection) */}
                <div className="flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="bg-slate-800 p-5 flex items-center gap-3 text-white font-black uppercase tracking-[0.2em] text-lg">
                        <Edit3 className="w-6 h-6" /> CATATAN REAKTOR (S, T, U, V, W)
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                        {['S', 'T', 'U', 'V', 'W'].map(reactor => (
                            <div key={reactor} className="flex flex-col gap-2">
                                <div className="flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {reactor}
                                </div>
                                {isEditing ? (
                                    <textarea 
                                        value={reactorNotes[reactor] || ''} 
                                        onChange={e => setReactorNotes({...reactorNotes, [reactor]: e.target.value})}
                                        placeholder={`Catatan Reaktor ${reactor}...`}
                                        className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                                    />
                                ) : (
                                    <div className="w-full min-h-[8rem] p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-600 dark:text-slate-400">
                                        {reactorNotes[reactor] || <span className="italic opacity-50">Tidak ada catatan...</span>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};
