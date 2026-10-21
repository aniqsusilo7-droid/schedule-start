import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, Trash2, Handshake } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { ShiftGroup, ShiftSlot } from '../utils/shiftSchedule';

interface ShiftItem {
  name: string;
  time: string;
  closeMode: string;
  openMode: string;
}

interface KesepakatanData {
  shifts: ShiftItem[];
  additionalNotes: string[];
  footerNote: string;
}

const DEFAULT_DATA: KesepakatanData = {
  shifts: [
    { name: 'SHIFT 1', time: '22:45 - 07:00', closeMode: '22:25', openMode: '21:55' },
    { name: 'SHIFT 2', time: '06:45 - 15:00', closeMode: '06:25', openMode: '05:55' },
    { name: 'SHIFT 3', time: '14:45 - 23:00', closeMode: '14:25', openMode: '13:55' },
  ],
  additionalNotes: [
    'DEMONOMER F LINE WASHING Pertama >= JAM 06:25 , 14:25 , 22:25',
    'SAMPLE SA DISSOLUTION COMPLETE >= JAM 22:25',
    'SILO CHARGE COMPLETTE >= JAM 6:25 , 14:25 , 22:25',
  ],
  footerNote: 'TANGGUNG JAWAB SHIFT YANG BARU DATANG',
};

interface KesepakatanProps {
  currentGrade?: string;
  shiftGroups?: Record<ShiftSlot, ShiftGroup>;
  embedded?: boolean;
}

export const Kesepakatan: React.FC<KesepakatanProps> = ({
  embedded = false,
}) => {
  const [data, setData] = useState<KesepakatanData>(() => {
    const saved = localStorage.getItem('kesepakatanData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse kesepakatan data', e);
      }
    }
    return DEFAULT_DATA;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState<KesepakatanData>(data);

  useEffect(() => {
    const fetchKesepakatan = async () => {
      try {
        const { data: dbData, error } = await supabase
          .from('kesepakatan')
          .select('data')
          .eq('id', 1)
          .single();

        if (!error && dbData?.data) {
          setData(dbData.data);
          setTempData(dbData.data);
          localStorage.setItem('kesepakatanData', JSON.stringify(dbData.data));
        }
      } catch (err) {
        console.error('Error fetching kesepakatan:', err);
      }
    };

    fetchKesepakatan();

    const channel = supabase
      .channel('kesepakatan_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kesepakatan', filter: 'id=eq.1' },
        (payload) => {
          const newRow = payload.new as { data?: KesepakatanData };
          if (newRow?.data) {
            setData(newRow.data);
            setTempData(newRow.data);
            localStorage.setItem('kesepakatanData', JSON.stringify(newRow.data));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSave = async () => {
    setData(tempData);
    localStorage.setItem('kesepakatanData', JSON.stringify(tempData));
    setIsEditing(false);
    try {
      await supabase
        .from('kesepakatan')
        .upsert({ id: 1, data: tempData, updated_at: new Date().toISOString() });
    } catch (err) {
      console.error('Error saving kesepakatan:', err);
    }
  };

  const handleCancel = () => {
    setTempData(data);
    setIsEditing(false);
  };

  const updateShift = (index: number, field: keyof ShiftItem, value: string) => {
    const updated = [...tempData.shifts];
    updated[index] = { ...updated[index], [field]: value };
    setTempData({ ...tempData, shifts: updated });
  };

  const updateNote = (index: number, value: string) => {
    const updated = [...tempData.additionalNotes];
    updated[index] = value;
    setTempData({ ...tempData, additionalNotes: updated });
  };

  const addNote = () => {
    setTempData({
      ...tempData,
      additionalNotes: [...tempData.additionalNotes, 'Catatan Baru'],
    });
  };

  const removeNote = (index: number) => {
    setTempData({
      ...tempData,
      additionalNotes: tempData.additionalNotes.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      className={
        embedded
          ? 'flex flex-col h-full w-full bg-white dark:bg-slate-800 overflow-hidden'
          : 'flex flex-col h-full w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden'
      }
    >
      {/* Header */}
      <div className="bg-amber-600 text-white font-bold px-3 py-1.5 flex items-center justify-between border-b border-amber-700">
        <div className="flex items-center gap-1.5 text-[0.95em] tracking-wider uppercase font-black">
          <Handshake className="w-4 h-4 shrink-0" />
          <span>KESEPAKATAN SHIFT</span>
        </div>
        <div className="flex items-center gap-1">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => {
                setTempData(data);
                setIsEditing(true);
              }}
              className="p-1 hover:bg-amber-700 rounded transition-colors cursor-pointer"
              title="Edit Kesepakatan"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="p-1 bg-emerald-600 hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                title="Simpan"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 bg-rose-600 hover:bg-rose-700 rounded transition-colors cursor-pointer"
                title="Batal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table & Content */}
      <div className="flex-1 p-2 flex flex-col justify-between gap-2 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-[0.8em]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-black uppercase">
                <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">SHIFT</th>
                <th className="border border-slate-300 dark:border-slate-700 px-2 py-1">JAM KERJA</th>
                <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-emerald-700 dark:text-emerald-400">CLOSE MODE (&ge;)</th>
                <th className="border border-slate-300 dark:border-slate-700 px-2 py-1 text-amber-700 dark:text-amber-400">OPEN MODE (&ge;)</th>
              </tr>
            </thead>
            <tbody>
              {(isEditing ? tempData.shifts : data.shifts).map((s, idx) => (
                <tr key={idx} className="font-bold text-slate-800 dark:text-slate-200">
                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 bg-slate-50 dark:bg-slate-800/60 font-black">
                    {isEditing ? (
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateShift(idx, 'name', e.target.value)}
                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5"
                      />
                    ) : (
                      s.name
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 font-mono">
                    {isEditing ? (
                      <input
                        type="text"
                        value={s.time}
                        onChange={(e) => updateShift(idx, 'time', e.target.value)}
                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5"
                      />
                    ) : (
                      s.time
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {isEditing ? (
                      <input
                        type="text"
                        value={s.closeMode}
                        onChange={(e) => updateShift(idx, 'closeMode', e.target.value)}
                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5"
                      />
                    ) : (
                      s.closeMode
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 px-2 py-1 font-mono font-black text-amber-600 dark:text-amber-400">
                    {isEditing ? (
                      <input
                        type="text"
                        value={s.openMode}
                        onChange={(e) => updateShift(idx, 'openMode', e.target.value)}
                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5"
                      />
                    ) : (
                      s.openMode
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Additional Notes */}
        <div className="space-y-1 text-[0.75em] font-bold text-slate-700 dark:text-slate-300">
          {(isEditing ? tempData.additionalNotes : data.additionalNotes).map((note, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded px-2 py-1">
              <span className="text-amber-600 dark:text-amber-400 font-black">•</span>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => updateNote(idx, e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => removeNote(idx)}
                    className="text-rose-500 hover:text-rose-700 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <span className="flex-1">{note}</span>
              )}
            </div>
          ))}
          {isEditing && (
            <button
              type="button"
              onClick={addNote}
              className="w-full py-1 border border-dashed border-amber-400 text-amber-600 dark:text-amber-400 rounded flex items-center justify-center gap-1 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Catatan
            </button>
          )}
        </div>

        {/* Footer Note */}
        <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 rounded px-2 py-1 text-center font-black text-[0.75em] text-amber-900 dark:text-amber-200 uppercase tracking-wide">
          {isEditing ? (
            <input
              type="text"
              value={tempData.footerNote}
              onChange={(e) => setTempData({ ...tempData, footerNote: e.target.value })}
              className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5"
            />
          ) : (
            data.footerNote
          )}
        </div>
      </div>
    </div>
  );
};
