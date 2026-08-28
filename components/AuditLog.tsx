import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Filter,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { auditEventLabel, AuditLogRow } from '../utils/auditLog';
import { ShiftSlot } from '../utils/shiftSchedule';

const SHIFT_OPTIONS: ShiftSlot[] = ['I', 'II', 'III'];
const PAGE_SIZE = 40;
const EVENT_OPTIONS = [
  { value: 'schedule', label: 'Schedule' },
  { value: 'silo', label: 'Silo' },
  { value: 'steam_adjust', label: 'Steam adjust' },
  { value: 'grade', label: 'Grade' },
  { value: 'cycle_time', label: 'Cycle time' },
  { value: 'settings', label: 'Pengaturan' },
];

const categoryFromEvent = (eventType: string) => eventType.split('.')[0];

const EVENT_COLORS: Record<string, string> = {
  schedule: 'bg-amber-500 text-slate-950',
  silo: 'bg-cyan-500 text-slate-950',
  steam_adjust: 'bg-teal-500 text-slate-950',
  grade: 'bg-fuchsia-500 text-white',
  grade_mode: 'bg-fuchsia-500 text-white',
  cycle_time: 'bg-blue-500 text-white',
  settings: 'bg-slate-500 text-white',
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const prettyGroup = (group?: string) => (group ? `Grup ${group.replace(/^GRUP\s+/i, '')}` : '—');

export const AuditLog: React.FC = () => {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [shift, setShift] = useState<'all' | ShiftSlot>('all');
  const [date, setDate] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchText.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const loadPage = useCallback(async (reset = false) => {
    const nextPage = reset ? 0 : pageRef.current;
    if (reset) setIsLoading(true);
    else setIsLoadingMore(true);

    const safeQuery = query.replace(/[%,()]/g, ' ').trim();
    let request = supabase
      .from('audit_logs')
      .select('id, event_type, entity_type, entity_id, summary, changed_at, administrative_date, active_shifts, shift_groups, before_data, after_data')
      .order('changed_at', { ascending: false })
      .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);

    if (safeQuery) {
      request = request.or(`summary.ilike.%${safeQuery}%,entity_id.ilike.%${safeQuery}%,event_type.ilike.%${safeQuery}%`);
    }
    if (category !== 'all') request = request.like('event_type', `${category}.%`);
    if (shift !== 'all') request = request.contains('active_shifts', [shift]);
    if (date) request = request.eq('administrative_date', date);

    const { data, error: fetchError } = await request;

    if (fetchError) {
      const missingTable = fetchError.code === '42P01' || fetchError.code === 'PGRST205';
      setError(missingTable
        ? 'Tabel audit_logs belum tersedia. Jalankan blok SQL audit_logs di supabase_schema.sql melalui Supabase SQL Editor.'
        : `Gagal membaca riwayat: ${fetchError.message}`);
      if (reset) setRows([]);
    } else {
      setError(null);
      const nextRows = (data || []) as AuditLogRow[];
      setRows(previous => {
        if (reset) return nextRows;
        const known = new Set(previous.map(row => row.id));
        return [...previous, ...nextRows.filter(row => !known.has(row.id))];
      });
      pageRef.current = nextPage + 1;
      setHasMore(nextRows.length === PAGE_SIZE);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, [category, date, query, shift]);

  useEffect(() => {
    pageRef.current = 0;
    setHasMore(true);
    setExpandedId(null);
    void loadPage(true);
  }, [category, date, loadPage, query, shift]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || isLoading || isLoadingMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void loadPage(false);
    }, { rootMargin: '360px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, loadPage]);

  const refreshLogs = () => {
    setHasMore(true);
    setIsRefreshing(true);
    void loadPage(true).finally(() => setIsRefreshing(false));
  };

  const clearFilters = () => {
    setSearchText('');
    setQuery('');
    setCategory('all');
    setShift('all');
    setDate('');
  };

  return (
    <section className="min-h-full rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 sm:p-5 lg:p-6 animate-in fade-in duration-300">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-xl bg-amber-400 p-2.5 text-slate-950 shadow-lg shadow-amber-500/20">
                <History className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Sistem / Audit Trail</p>
                <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">Riwayat Perubahan</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={refreshLogs}
              disabled={isRefreshing}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
          </div>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0"><p className="font-black">Riwayat belum terhubung</p><p className="mt-1 text-sm font-medium leading-relaxed">{error}</p></div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200"><Filter className="h-4 w-4 text-cyan-500" /> Filter riwayat</div>
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-3.5 w-3.5" /> Bersihkan</button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative block sm:col-span-2 lg:col-span-1"><span className="sr-only">Cari riwayat</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Cari ringkasan / ID..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>
            <label><span className="sr-only">Kategori</span><select value={category} onChange={e => setCategory(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><option value="all">Semua kategori</option>{EVENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span className="sr-only">Shift aktif</span><select value={shift} onChange={e => setShift(e.target.value as 'all' | ShiftSlot)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><option value="all">Semua shift aktif</option>{SHIFT_OPTIONS.map(option => <option key={option} value={option}>Shift {option}</option>)}</select></label>
            <label className="relative block"><span className="sr-only">Tanggal administratif</span><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isLoading ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-slate-500"><RefreshCw className="h-7 w-7 animate-spin text-cyan-500" /><span className="text-xs font-black uppercase tracking-widest">Memuat riwayat...</span></div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center text-slate-500 dark:text-slate-400"><Database className="h-9 w-9 text-slate-300 dark:text-slate-600" /><p className="font-black">Belum ada perubahan yang cocok.</p><p className="max-w-md text-sm font-medium">Log akan muncul setelah penyimpanan schedule, silo, steam adjust, atau grade berhasil dilakukan.</p></div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map(row => {
                const categoryKey = categoryFromEvent(row.event_type);
                const groups = row.shift_groups || {};
                const isExpanded = expandedId === row.id;
                return (
                  <article key={row.id} className="p-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className={`mt-0.5 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide ${EVENT_COLORS[categoryKey] || 'bg-slate-200 text-slate-800'}`}>{categoryKey.replace('_', ' ')}</div>
                        <div className="min-w-0"><h2 className="break-words text-sm font-black text-slate-800 dark:text-white sm:text-base">{row.summary || auditEventLabel(row.event_type)}</h2><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatTimestamp(row.changed_at)}</span>{row.entity_id && <span className="font-mono">ID: {row.entity_id}</span>}</p></div>
                      </div>
                      <button type="button" onClick={() => setExpandedId(isExpanded ? null : row.id)} className="inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-black text-slate-600 transition hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-cyan-300"><span>{isExpanded ? 'Tutup detail' : 'Lihat detail'}</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-black uppercase tracking-wide">
                      {(row.active_shifts || []).length > 0 ? (row.active_shifts || []).map(activeShift => <span key={activeShift} className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"><ShieldCheck className="h-3 w-3" /> Shift {activeShift}</span>) : <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-500 dark:bg-slate-800">Tidak ada shift aktif</span>}
                      {SHIFT_OPTIONS.map(slot => <span key={slot} className="rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{slot}: {prettyGroup(groups[slot])}</span>)}
                      {row.administrative_date && <span className="rounded-md bg-indigo-100 px-2 py-1 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">Administratif: {row.administrative_date}</span>}
                    </div>
                    {isExpanded && <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 lg:grid-cols-2"><div className="min-w-0"><div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300"><AlertTriangle className="h-3.5 w-3.5" /> Sebelum</div><pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-rose-200">{formatValue(row.before_data)}</pre></div><div className="min-w-0"><div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Sesudah</div><pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-emerald-200">{formatValue(row.after_data)}</pre></div></div>}
                  </article>
                );
              })}
            </div>
          )}
          {!isLoading && rows.length > 0 && (
            <div ref={loadMoreRef} className="border-t border-slate-100 p-4 text-center dark:border-slate-800">
              {isLoadingMore ? (
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-300"><RefreshCw className="h-4 w-4 animate-spin" /> Memuat berikutnya...</span>
              ) : hasMore ? (
                <button type="button" onClick={() => void loadPage(false)} className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">Muat lebih banyak</button>
              ) : (
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Semua log yang cocok sudah dimuat</span>
              )}
            </div>
          )}
        </div>
        <p className="flex items-center justify-center gap-1.5 px-2 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Pencarian diproses di database; scroll ke bawah untuk mengambil halaman berikutnya.</p>
      </div>
    </section>
  );
};
