import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CreditCard, Plus, Trash2, Edit3, Save, X, DollarSign, TrendingUp, TrendingDown, Wallet, Calendar, User, History, AlertCircle } from 'lucide-react';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';

export interface KasMember {
  id: string;
  name: string;
}

export interface KasIncome {
  id: string;
  memberId: string;
  amount: number;
  month: string; // YYYY-MM
  note: string;
}

export interface KasExpense {
  id: string;
  amount: number;
  month: string; // YYYY-MM
  purpose: string;
  date: string; // full ISO string or YYYY-MM-DD
}

export interface KasOtherIncome {
  id: string;
  amount: number;
  month: string; // YYYY-MM
  description: string;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface GroupKasData {
  members: KasMember[];
  incomes: KasIncome[];
  expenses: KasExpense[];
  openingBalance: number;
  otherIncomes: KasOtherIncome[];
}

export interface AllKasData {
  [groupName: string]: GroupKasData;
}

interface KasGrupProps {
  activeGroup: string;
}

const getDefaultGroupData = (): GroupKasData => ({
  members: [],
  incomes: [],
  expenses: [],
  openingBalance: 0,
  otherIncomes: [],
});

/** Data lama di Supabase belum mempunyai saldo awal dan pemasukan lain.
 * Normalisasi dilakukan hanya di memori; database baru berubah saat pengguna
 * menekan tombol Simpan. */
const normalizeGroupData = (data?: Partial<GroupKasData>): GroupKasData => ({
  members: Array.isArray(data?.members) ? data.members : [],
  incomes: Array.isArray(data?.incomes) ? data.incomes : [],
  expenses: Array.isArray(data?.expenses) ? data.expenses : [],
  openingBalance: Number.isFinite(Number(data?.openingBalance)) ? Number(data?.openingBalance) : 0,
  otherIncomes: Array.isArray(data?.otherIncomes) ? data.otherIncomes : [],
});

export const KasGrup: React.FC<KasGrupProps> = ({ activeGroup }) => {
  const [allData, setAllData] = useState<AllKasData>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<KasMember | null>(null);
  const [memberFormName, setMemberFormName] = useState('');

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<KasIncome | null>(null);
  const [incomeForm, setIncomeForm] = useState({ memberId: '', amount: 0, note: '' });

  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [openingBalanceForm, setOpeningBalanceForm] = useState(0);

  const [isOtherIncomeModalOpen, setIsOtherIncomeModalOpen] = useState(false);
  const [editingOtherIncome, setEditingOtherIncome] = useState<KasOtherIncome | null>(null);
  const [otherIncomeForm, setOtherIncomeForm] = useState({
    description: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    note: '',
  });

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [editingExpense, setEditingExpense] = useState<KasExpense | null>(null);
  const [expenseForm, setExpenseForm] = useState({ purpose: '', amount: 0, date: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('kas_grup').select('data').eq('id', 1).single();
      if (data && data.data) {
        setAllData(data.data as AllKasData);
      }
    } catch (err) {
      console.error('Error loading kas data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (newData: AllKasData) => {
    setIsSaving(true);
    try {
      setAllData(newData);
      await supabase.from('kas_grup').upsert({ id: 1, data: newData, updated_at: new Date().toISOString() });
    } catch (err) {
      console.error('Error saving kas data:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeGroupData = normalizeGroupData(allData[activeGroup]);
  const monthKey = format(currentMonth, 'yyyy-MM');
  
  const currentMonthIncomes = activeGroupData.incomes.filter(inc => inc.month === monthKey);
  const currentMonthExpenses = activeGroupData.expenses.filter(exp => exp.month === monthKey);
  const currentMonthOtherIncomes = activeGroupData.otherIncomes.filter(inc => inc.month === monthKey);

  // Stats
  const totalIncomeAllTime = activeGroupData.incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
  const totalOtherIncomeAllTime = activeGroupData.otherIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
  const totalExpenseAllTime = activeGroupData.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const totalSaldo = activeGroupData.openingBalance + totalIncomeAllTime + totalOtherIncomeAllTime - totalExpenseAllTime;

  const totalMemberIncomeThisMonth = currentMonthIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
  const totalOtherIncomeThisMonth = currentMonthOtherIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
  const totalIncomeThisMonth = totalMemberIncomeThisMonth + totalOtherIncomeThisMonth;
  const totalExpenseThisMonth = currentMonthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // --- Handlers ---
  const saveMember = () => {
    if (!memberFormName.trim()) return;
    const newData = { ...allData };
    if (!newData[activeGroup]) newData[activeGroup] = getDefaultGroupData();

    if (editingMember) {
      newData[activeGroup].members = newData[activeGroup].members.map(m => 
        m.id === editingMember.id ? { ...m, name: memberFormName.trim() } : m
      );
    } else {
      newData[activeGroup].members.push({ id: Date.now().toString(), name: memberFormName.trim() });
    }
    
    saveData(newData);
    setIsMemberModalOpen(false);
    setMemberFormName('');
    setEditingMember(null);
  };

  const deleteMember = (id: string) => {
    setConfirmDialog({
      title: 'Hapus Anggota',
      message: 'Yakin ingin menghapus anggota ini? Historis pemasukan anggota ini tetap akan ada tapi tanpa nama anggota jika dihapus sepenuhnya.',
      onConfirm: () => {
        const newData = { ...allData };
        newData[activeGroup].members = newData[activeGroup].members.filter(m => m.id !== id);
        saveData(newData);
        setConfirmDialog(null);
      }
    });
  };

  const saveIncome = () => {
    if (!incomeForm.memberId || incomeForm.amount <= 0) return;
    const newData = { ...allData };
    if (!newData[activeGroup]) newData[activeGroup] = getDefaultGroupData();

    if (editingIncome) {
      newData[activeGroup].incomes = newData[activeGroup].incomes.map(inc => 
        inc.id === editingIncome.id ? { ...inc, ...incomeForm } : inc
      );
    } else {
      newData[activeGroup].incomes.push({
        id: Date.now().toString(),
        month: monthKey,
        ...incomeForm
      });
    }

    saveData(newData);
    setIsIncomeModalOpen(false);
    setEditingIncome(null);
  };

  const deleteIncome = (id: string) => {
    setConfirmDialog({
      title: 'Hapus Setoran Pemasukan',
      message: 'Yakin ingin menghapus data pemasukan/setoran ini secara permanen?',
      onConfirm: () => {
        const newData = { ...allData };
        newData[activeGroup].incomes = newData[activeGroup].incomes.filter(inc => inc.id !== id);
        saveData(newData);
        setConfirmDialog(null);
      }
    });
  };

  const saveOpeningBalance = () => {
    if (!Number.isFinite(openingBalanceForm)) return;
    const newData = { ...allData };
    const groupData = normalizeGroupData(newData[activeGroup]);
    newData[activeGroup] = {
      ...groupData,
      openingBalance: Number(openingBalanceForm),
    };
    saveData(newData);
    setIsOpeningBalanceModalOpen(false);
  };

  const openNewOtherIncomeModal = () => {
    setEditingOtherIncome(null);
    setOtherIncomeForm({
      description: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      note: '',
    });
    setIsOtherIncomeModalOpen(true);
  };

  const saveOtherIncome = () => {
    if (!otherIncomeForm.description.trim() || otherIncomeForm.amount <= 0 || !otherIncomeForm.date) return;

    const newData = { ...allData };
    const groupData = normalizeGroupData(newData[activeGroup]);
    const savedIncome: KasOtherIncome = {
      id: editingOtherIncome?.id || Date.now().toString(),
      description: otherIncomeForm.description.trim(),
      amount: Number(otherIncomeForm.amount),
      date: otherIncomeForm.date,
      month: otherIncomeForm.date.substring(0, 7),
      note: otherIncomeForm.note.trim() || undefined,
    };

    newData[activeGroup] = {
      ...groupData,
      otherIncomes: editingOtherIncome
        ? groupData.otherIncomes.map(income => income.id === editingOtherIncome.id ? savedIncome : income)
        : [...groupData.otherIncomes, savedIncome],
    };

    saveData(newData);
    setIsOtherIncomeModalOpen(false);
    setEditingOtherIncome(null);
  };

  const deleteOtherIncome = (income: KasOtherIncome) => {
    setConfirmDialog({
      title: 'Hapus Pemasukan Lain',
      message: `Yakin ingin menghapus pemasukan "${income.description}" sebesar ${formatRp(income.amount)}?`,
      onConfirm: () => {
        const newData = { ...allData };
        const groupData = normalizeGroupData(newData[activeGroup]);
        newData[activeGroup] = {
          ...groupData,
          otherIncomes: groupData.otherIncomes.filter(item => item.id !== income.id),
        };
        saveData(newData);
        setConfirmDialog(null);
      },
    });
  };

  const saveExpense = () => {
    if (!expenseForm.purpose.trim() || expenseForm.amount <= 0 || !expenseForm.date) return;
    const newData = { ...allData };
    if (!newData[activeGroup]) newData[activeGroup] = getDefaultGroupData();

    if (editingExpense) {
      newData[activeGroup].expenses = newData[activeGroup].expenses.map(exp => 
        exp.id === editingExpense.id ? { ...exp, ...expenseForm, month: expenseForm.date.substring(0, 7) } : exp
      );
    } else {
      newData[activeGroup].expenses.push({
        id: Date.now().toString(),
        month: expenseForm.date.substring(0, 7),
        ...expenseForm
      });
    }

    saveData(newData);
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const deleteExpense = (id: string) => {
    setConfirmDialog({
      title: 'Hapus Data Pengeluaran',
      message: 'Yakin ingin menghapus data pengeluaran ini secara permanen?',
      onConfirm: () => {
        const newData = { ...allData };
        newData[activeGroup].expenses = newData[activeGroup].expenses.filter(exp => exp.id !== id);
        saveData(newData);
        setConfirmDialog(null);
      }
    });
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Memuat data kas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER & MONTH NAVIGATOR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-500">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Buku Kas: {activeGroup}
            </h2>
            <p className="text-xs font-bold opacity-80">Catatan Pemasukan & Pengeluaran</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button onClick={prevMonth} className="px-3 py-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors font-bold text-slate-600 dark:text-slate-300">
            &laquo;
          </button>
          <div className="px-4 flex items-center gap-2 font-black text-sm uppercase text-slate-900 dark:text-white min-w-[140px] justify-center">
            <Calendar className="w-4 h-4 text-emerald-500" />
            {format(currentMonth, 'MMMM yyyy', { locale: id })}
          </div>
          <button onClick={nextMonth} className="px-3 py-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors font-bold text-slate-600 dark:text-slate-300">
            &raquo;
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
          <Wallet className="w-24 h-24 absolute -right-4 -bottom-4 text-white/10" />
          <div className="relative z-10">
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Total Saldo Kas</p>
            <h3 className="text-2xl md:text-3xl font-black">{formatRp(totalSaldo)}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-emerald-100 bg-black/10 inline-block px-2 py-1 rounded-md">Semua Waktu</span>
              <button
                type="button"
                onClick={() => {
                  setOpeningBalanceForm(activeGroupData.openingBalance);
                  setIsOpeningBalanceModalOpen(true);
                }}
                className="text-[10px] font-bold text-white bg-black/15 hover:bg-black/25 px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                title="Edit saldo awal grup"
              >
                Saldo awal: {formatRp(activeGroupData.openingBalance)}
                <Edit3 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Pemasukan</p>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{formatRp(totalIncomeThisMonth)}</h3>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 bg-emerald-50 dark:bg-emerald-900/20 inline-block px-2 py-1 rounded-md">Bulan {format(currentMonth, 'MMMM')}</p>
            {totalOtherIncomeThisMonth > 0 && (
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                Termasuk pemasukan lain {formatRp(totalOtherIncomeThisMonth)}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Pengeluaran</p>
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{formatRp(totalExpenseThisMonth)}</h3>
            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 inline-block px-2 py-1 rounded-md">Bulan {format(currentMonth, 'MMMM')}</p>
          </div>
        </div>
      </div>

      {/* TWO COLUMNS: PEMASUKAN vs PENGELUARAN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PEMASUKAN COLUMN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
            <h3 className="font-black text-sm uppercase text-slate-800 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" /> Daftar Anggota & Pemasukan
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={openNewOtherIncomeModal}
                className="text-xs bg-cyan-100 hover:bg-cyan-200 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-900/60 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <DollarSign className="w-3 h-3" /> Pemasukan Lain
              </button>
              <button
                onClick={() => { setEditingMember(null); setMemberFormName(''); setIsMemberModalOpen(true); }}
                className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Anggota Baru
              </button>
            </div>
          </div>
          
          <div className="p-2 flex-1 overflow-y-auto max-h-[500px]">
            {activeGroupData.members.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm font-bold">
                Belum ada anggota di grup ini.<br/>Tambahkan anggota untuk mencatat iuran/kas.
              </div>
            ) : (
              <div className="space-y-2">
                {activeGroupData.members.map(member => {
                  const incomeRecord = currentMonthIncomes.find(inc => inc.memberId === member.id);
                  return (
                    <div key={member.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-between group hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 uppercase">
                          {member.name.substring(0,2)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            {member.name}
                            <button onClick={() => { setEditingMember(member); setMemberFormName(member.name); setIsMemberModalOpen(true); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-all"><Edit3 className="w-3 h-3"/></button>
                            <button onClick={() => deleteMember(member.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"><Trash2 className="w-3 h-3"/></button>
                          </div>
                          {incomeRecord ? (
                            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircleIcon className="w-3 h-3" /> Lunas: {formatRp(incomeRecord.amount)}
                            </div>
                          ) : (
                            <div className="text-[11px] font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                              <XCircleIcon className="w-3 h-3" /> Belum Bayar Bulan Ini
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        {incomeRecord ? (
                          <div className="flex gap-1">
                            <button 
                              onClick={() => { setEditingIncome(incomeRecord); setIncomeForm({ memberId: incomeRecord.memberId, amount: incomeRecord.amount, note: incomeRecord.note || '' }); setIsIncomeModalOpen(true); }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-md transition-colors"
                              title="Edit Setoran"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deleteIncome(incomeRecord.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-md transition-colors"
                              title="Hapus Setoran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingIncome(null); setIncomeForm({ memberId: member.id, amount: 0, note: 'Kas Bulanan' }); setIsIncomeModalOpen(true); }}
                            className="text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            Setor Kas
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2 px-1 mb-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Pemasukan Lain Bulan Ini
                </h4>
                <span className="text-[10px] font-black text-cyan-700 dark:text-cyan-300">
                  {formatRp(totalOtherIncomeThisMonth)}
                </span>
              </div>

              {currentMonthOtherIncomes.length === 0 ? (
                <div className="py-4 text-center text-[11px] font-bold text-slate-400">
                  Belum ada pemasukan lain pada bulan ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentMonthOtherIncomes.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(income => (
                    <div key={income.id} className="p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/60 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{income.description}</div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(parse(income.date, 'yyyy-MM-dd', new Date()), 'dd MMM yyyy', { locale: id })}
                          </span>
                          {income.note && <span className="truncate">• {income.note}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-black text-cyan-700 dark:text-cyan-300 text-sm">+{formatRp(income.amount)}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOtherIncome(income);
                              setOtherIncomeForm({
                                description: income.description,
                                amount: income.amount,
                                date: income.date,
                                note: income.note || '',
                              });
                              setIsOtherIncomeModalOpen(true);
                            }}
                            className="p-1.5 bg-white/80 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors cursor-pointer"
                            title="Edit pemasukan lain"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteOtherIncome(income)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-md transition-colors cursor-pointer"
                            title="Hapus pemasukan lain"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PENGELUARAN COLUMN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
            <h3 className="font-black text-sm uppercase text-slate-800 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-rose-500" /> Data Pengeluaran
            </h3>
            <button 
              onClick={() => { setEditingExpense(null); setExpenseForm({ purpose: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd') }); setIsExpenseModalOpen(true); }}
              className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/60 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Catat Keluar
            </button>
          </div>
          
          <div className="p-2 flex-1 overflow-y-auto max-h-[500px]">
            {currentMonthExpenses.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm font-bold">
                Tidak ada data pengeluaran<br/>pada bulan ini.
              </div>
            ) : (
              <div className="space-y-2">
                {currentMonthExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                  <div key={exp.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-between group hover:border-rose-200 dark:hover:border-rose-800 transition-colors">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {exp.purpose}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(parse(exp.date, 'yyyy-MM-dd', new Date()), 'dd MMM yyyy', { locale: id })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="font-black text-rose-600 dark:text-rose-400 text-sm">
                        -{formatRp(exp.amount)}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => { setEditingExpense(exp); setExpenseForm({ purpose: exp.purpose, amount: exp.amount, date: exp.date }); setIsExpenseModalOpen(true); }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-md transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => deleteExpense(exp.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {/* Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
              <h3 className="font-black">{editingMember ? 'Edit Anggota' : 'Tambah Anggota'}</h3>
              <button onClick={() => setIsMemberModalOpen(false)}><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nama Anggota</label>
                <input 
                  type="text" 
                  value={memberFormName}
                  onChange={e => setMemberFormName(e.target.value)}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-bold dark:text-white"
                  placeholder="Ketik nama lengkap / panggilan"
                  autoFocus
                />
              </div>
              <button 
                onClick={saveMember}
                className="w-full py-2.5 bg-emerald-500 text-white font-black rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Income Modal */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
              <h3 className="font-black">{editingIncome ? 'Edit Pemasukan' : 'Setor Pemasukan Kas'}</h3>
              <button onClick={() => setIsIncomeModalOpen(false)}><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Anggota</label>
                <div className="font-black text-slate-800 dark:text-white mt-1">
                  {activeGroupData.members.find(m => m.id === incomeForm.memberId)?.name || 'Unknown'}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Bulan Setoran</label>
                <div className="font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {format(currentMonth, 'MMMM yyyy', { locale: id })}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Jumlah (Rp)</label>
                <input 
                  type="number" 
                  value={incomeForm.amount || ''}
                  onChange={e => setIncomeForm({...incomeForm, amount: Number(e.target.value)})}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-black text-lg dark:text-white"
                  placeholder="Contoh: 50000"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Keterangan (Opsional)</label>
                <input 
                  type="text" 
                  value={incomeForm.note}
                  onChange={e => setIncomeForm({...incomeForm, note: e.target.value})}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-bold text-sm dark:text-white"
                  placeholder="Keterangan..."
                />
              </div>
              <button 
                onClick={saveIncome}
                className="w-full py-2.5 bg-emerald-500 text-white font-black rounded-lg hover:bg-emerald-600 transition-colors mt-2"
              >
                Simpan Setoran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Balance Modal */}
      {isOpeningBalanceModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-teal-600 text-white flex justify-between items-center">
              <h3 className="font-black">Edit Saldo Awal {activeGroup}</h3>
              <button type="button" onClick={() => setIsOpeningBalanceModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/60 rounded-xl text-xs font-semibold text-teal-800 dark:text-teal-200 leading-relaxed">
                Saldo awal adalah sisa kas sebelum pencatatan di aplikasi. Nilai ini masuk ke Total Saldo, tetapi tidak dihitung sebagai pemasukan bulan berjalan.
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  value={openingBalanceForm || ''}
                  onChange={e => setOpeningBalanceForm(Number(e.target.value))}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-black text-lg dark:text-white"
                  placeholder="Contoh: 500000"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={saveOpeningBalance}
                className="w-full py-2.5 bg-teal-600 text-white font-black rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Simpan Saldo Awal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Income Modal */}
      {isOtherIncomeModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-cyan-600 text-white flex justify-between items-center">
              <h3 className="font-black">{editingOtherIncome ? 'Edit Pemasukan Lain' : 'Catat Pemasukan Lain'}</h3>
              <button
                type="button"
                onClick={() => { setIsOtherIncomeModalOpen(false); setEditingOtherIncome(null); }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Tanggal</label>
                <input
                  type="date"
                  value={otherIncomeForm.date}
                  onChange={e => setOtherIncomeForm({ ...otherIncomeForm, date: e.target.value })}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-bold dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Sumber / Nama Pemasukan</label>
                <input
                  type="text"
                  value={otherIncomeForm.description}
                  onChange={e => setOtherIncomeForm({ ...otherIncomeForm, description: e.target.value })}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-bold dark:text-white"
                  placeholder="Misal: Donasi, Bunga Bank, Penjualan"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Jumlah (Rp)</label>
                <input
                  type="number"
                  min="1"
                  value={otherIncomeForm.amount || ''}
                  onChange={e => setOtherIncomeForm({ ...otherIncomeForm, amount: Number(e.target.value) })}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-black text-lg dark:text-white"
                  placeholder="Contoh: 100000"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={otherIncomeForm.note}
                  onChange={e => setOtherIncomeForm({ ...otherIncomeForm, note: e.target.value })}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-bold text-sm dark:text-white"
                  placeholder="Catatan tambahan..."
                />
              </div>
              <button
                type="button"
                onClick={saveOtherIncome}
                className="w-full py-2.5 bg-cyan-600 text-white font-black rounded-lg hover:bg-cyan-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> {editingOtherIncome ? 'Simpan Perubahan' : 'Simpan Pemasukan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-rose-600 text-white flex justify-between items-center">
              <h3 className="font-black">{editingExpense ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}</h3>
              <button onClick={() => setIsExpenseModalOpen(false)}><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Tanggal</label>
                <input 
                  type="date" 
                  value={expenseForm.date}
                  onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-bold dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Tujuan / Nama Pengeluaran</label>
                <input 
                  type="text" 
                  value={expenseForm.purpose}
                  onChange={e => setExpenseForm({...expenseForm, purpose: e.target.value})}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-bold dark:text-white"
                  placeholder="Misal: Beli Kopi, Fotokopi..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Jumlah (Rp)</label>
                <input 
                  type="number" 
                  value={expenseForm.amount || ''}
                  onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                  className="w-full mt-1 p-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-transparent font-black text-lg dark:text-white"
                  placeholder="Contoh: 150000"
                />
              </div>
              <button 
                onClick={saveExpense}
                className="w-full py-2.5 bg-rose-500 text-white font-black rounded-lg hover:bg-rose-600 transition-colors mt-2"
              >
                Simpan Pengeluaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERIC CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border-2 border-red-500/50 p-5 space-y-4">
            <h3 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              {confirmDialog.title}
            </h3>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
