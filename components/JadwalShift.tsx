import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Moon, Sun, Sunset, Coffee, Users, RotateCcw, Info, Check, ChevronDown,
} from 'lucide-react';
import {
  getShiftAssignment, getShiftGroupsNow, getAdministrativeShiftDate, getGroupDuty, getActiveShifts,
  SHIFT_SLOTS, SHIFT_TIME_LABEL, ALL_SHIFT_GROUPS,
  ShiftGroup, ShiftSlot, ShiftDuty,
} from '../utils/shiftSchedule';

/* Rotasi shift murni hasil hitung dari tanggal jangkar (lihat
   utils/shiftSchedule.ts) — tidak ada data yang perlu disimpan. Karena itu
   halaman ini bisa dibuka untuk tanggal berapa pun, bertahun-tahun ke depan
   maupun ke belakang, tanpa perlu input kalender baru tiap tahun. */

const MIN_YEAR = 2000;
const MAX_YEAR = 2999;

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DOW = [
  { short: 'Min', full: 'Minggu' },
  { short: 'Sen', full: 'Senin' },
  { short: 'Sel', full: 'Selasa' },
  { short: 'Rab', full: 'Rabu' },
  { short: 'Kam', full: 'Kamis' },
  { short: 'Jum', full: 'Jumat' },
  { short: 'Sab', full: 'Sabtu' },
];
const DOW_MINI = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

const YEAR_OPTIONS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, index) => ({ value: MIN_YEAR + index, label: String(MIN_YEAR + index) })
);

interface PickerOption {
  value: number;
  label: string;
}

/** Dropdown aplikasi sendiri agar tampilan konsisten di semua browser. */
const CustomDropdown: React.FC<{
  value: number;
  options: PickerOption[];
  onChange: (value: number) => void;
  ariaLabel: string;
  widthClassName: string;
}> = ({ value, options, onChange, ariaLabel, widthClassName }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>('[data-selected="true"]')
        ?.scrollIntoView({ block: 'nearest' });
    });
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${widthClassName}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 outline-none transition hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <span className="truncate tabular-nums">{selected?.label ?? value}</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-[calc(100%+6px)] z-[60] max-h-72 w-full min-w-max overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected}
                style={options.length > 50 ? { contentVisibility: 'auto', containIntrinsicSize: '32px' } : undefined}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-xs font-black uppercase tracking-wide tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400 ${
                  isSelected
                    ? 'bg-rose-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {option.label}
                <Check aria-hidden="true" className={`h-3.5 w-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* Warna grup dibuat sama dengan kartu shift di header dan sub-menu sidebar,
   supaya satu grup selalu punya warna yang sama di seluruh aplikasi. */
const GROUP_SOLID: Record<ShiftGroup, string> = {
  A: 'bg-blue-600 text-white',
  B: 'bg-emerald-600 text-white',
  C: 'bg-purple-600 text-white',
  D: 'bg-amber-500 text-slate-950',
};
const GROUP_DOT: Record<ShiftGroup, string> = {
  A: 'bg-blue-600',
  B: 'bg-emerald-600',
  C: 'bg-purple-600',
  D: 'bg-amber-500',
};
const GROUP_RING: Record<ShiftGroup, string> = {
  A: 'ring-blue-400',
  B: 'ring-emerald-400',
  C: 'ring-purple-400',
  D: 'ring-amber-300',
};

interface DutyMeta {
  label: string;
  /** Label ringkas untuk sel kalender tahunan yang sempit. */
  short: string;
  cell: string;
  Icon: React.ComponentType<{ className?: string }>;
}

/* Warna di sini menandai JENIS shift (bukan grup), dipakai saat satu grup
   difokuskan sehingga tiap sel hanya perlu satu warna. */
const DUTY: Record<ShiftDuty, DutyMeta> = {
  I: {
    label: 'Shift I', short: 'I', Icon: Moon,
    cell: 'bg-indigo-600 text-white border-indigo-700',
  },
  II: {
    label: 'Shift II', short: 'II', Icon: Sun,
    cell: 'bg-sky-400 text-slate-950 border-sky-500',
  },
  III: {
    label: 'Shift III', short: 'III', Icon: Sunset,
    cell: 'bg-orange-500 text-slate-950 border-orange-600',
  },
  off: {
    label: 'Libur', short: 'LIBUR', Icon: Coffee,
    cell: 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700',
  },
};

const DUTY_ORDER: ShiftDuty[] = ['I', 'II', 'III', 'off'];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Sel satu bulan, sudah dipadatkan dengan sel kosong agar rapat 7 kolom. */
const buildMonthCells = (year: number, month: number): (Date | null)[] => {
  const lead = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const daysOfMonth = (year: number, month: number): Date[] => {
  const total = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => new Date(year, month, i + 1));
};

const daysOfYear = (year: number): Date[] => {
  const out: Date[] = [];
  for (let m = 0; m < 12; m++) out.push(...daysOfMonth(year, m));
  return out;
};

/** Jumlah hari tiap jenis tugas untuk satu grup pada rentang tanggal. */
const countDuties = (dates: Date[], group: ShiftGroup): Record<ShiftDuty, number> => {
  const acc: Record<ShiftDuty, number> = { I: 0, II: 0, III: 0, off: 0 };
  for (const d of dates) acc[getGroupDuty(group, d)]++;
  return acc;
};

const clampYear = (y: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, y));

type ViewMode = 'month' | 'year';

interface JadwalShiftProps {
  /** Waktu berjalan dari App, dipakai untuk menyorot hari & shift aktif. */
  now?: Date;
}

export const JadwalShift: React.FC<JadwalShiftProps> = ({ now: nowProp }) => {
  /* Kalau App tidak mengirim waktu, halaman pakai jamnya sendiri. Cukup
     menit-an: yang berubah hanya sorotan hari ini dan shift yang berjalan. */
  const [selfNow, setSelfNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (nowProp) return;
    const t = setInterval(() => setSelfNow(new Date()), 30000);
    return () => clearInterval(t);
  }, [nowProp]);
  const now = nowProp ?? selfNow;
  const administrativeDate = getAdministrativeShiftDate(now);

  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('shiftViewMode') as ViewMode) || 'month'
  );
  const [focusGroup, setFocusGroup] = useState<ShiftGroup | null>(() => {
    const saved = localStorage.getItem('shiftFocusGroup');
    return saved && (ALL_SHIFT_GROUPS as string[]).includes(saved) ? (saved as ShiftGroup) : null;
  });
  const [year, setYear] = useState(() => administrativeDate.getFullYear());
  const [month, setMonth] = useState(() => administrativeDate.getMonth());

  useEffect(() => localStorage.setItem('shiftViewMode', viewMode), [viewMode]);
  useEffect(() => {
    if (focusGroup) localStorage.setItem('shiftFocusGroup', focusGroup);
    else localStorage.removeItem('shiftFocusGroup');
  }, [focusGroup]);

  /* Panel "Hari Ini" mengikuti tanggal administratif, termasuk grup libur.
     Shift I tanggal berikutnya masuk pukul 22:45 untuk serah terima. */
  const todayGroups = getShiftGroupsNow(now);
  const todayOff = getShiftAssignment(administrativeDate).off;
  const activeSlots = getActiveShifts(now);

  const shiftMonth = useCallback((delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(clampYear(d.getFullYear()));
    setMonth(d.getMonth());
  }, [year, month]);

  const shiftYear = useCallback((delta: number) => setYear(y => clampYear(y + delta)), []);

  const goToday = useCallback(() => {
    const t = getAdministrativeShiftDate(new Date());
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  }, []);

  const monthCells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const statDates = useMemo(
    () => (viewMode === 'year' ? daysOfYear(year) : daysOfMonth(year, month)),
    [viewMode, year, month]
  );
  const stats = useMemo(
    () => ALL_SHIFT_GROUPS.map(g => ({ group: g, counts: countDuties(statDates, g) })),
    [statDates]
  );

  const periodLabel = viewMode === 'year' ? `Tahun ${year}` : `${MONTHS[month]} ${year}`;

  /* ---------------------------------------------------------------- */

  const GroupChip: React.FC<{ group: ShiftGroup | null }> = ({ group }) => {
    const isActive = focusGroup === group;
    return (
      <button
        type="button"
        onClick={() => setFocusGroup(group)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-[background-color,color,box-shadow,transform] active:scale-95 cursor-pointer ${
          isActive
            ? group
              ? `${GROUP_SOLID[group]} ring-2 ${GROUP_RING[group]} shadow-sm`
              : 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 ring-2 ring-slate-400 shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        {group ? (
          <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-white/90' : GROUP_DOT[group]}`} />
        ) : (
          <Users className="w-3.5 h-3.5 shrink-0" />
        )}
        {group ? `Grup ${group}` : 'Semua Grup'}
      </button>
    );
  };

  /** Satu sel tanggal pada tampilan bulan. */
  const MonthCell: React.FC<{ date: Date | null }> = ({ date }) => {
    if (!date) return <div className="rounded-xl bg-transparent" />;

    const isToday = isSameDay(date, administrativeDate);
    const assignment = getShiftAssignment(date);
    const isSunday = date.getDay() === 0;

    /* Satu grup difokuskan: seluruh sel diwarnai jenis shift hari itu. */
    if (focusGroup) {
      const duty = getGroupDuty(focusGroup, date);
      const meta = DUTY[duty];
      return (
        <div
          className={`relative rounded-xl border p-2 min-h-[82px] flex items-center justify-center transition-shadow ${meta.cell} ${
            isToday ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-950 shadow-lg' : ''
          }`}
        >
          <span className={`absolute left-2 top-2 text-lg sm:text-xl font-black leading-none tabular-nums ${isSunday && duty === 'off' ? 'text-rose-500' : ''}`}>
            {date.getDate()}
          </span>
          <meta.Icon className="absolute right-2 top-2 w-3.5 h-3.5 opacity-80" />
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <div className="text-sm sm:text-base font-black uppercase tracking-wide leading-none">
              {meta.label}
            </div>
            {duty !== 'off' && (
              <div className="text-[11px] sm:text-xs font-extrabold tracking-wide opacity-85 leading-none">
                {SHIFT_TIME_LABEL[duty]}
              </div>
            )}
          </div>
        </div>
      );
    }

    /* Tanpa fokus: tampilkan keempat grup — tiga shift plus yang libur. */
    return (
      <div
        className={`relative rounded-xl border p-1.5 min-h-[74px] flex flex-col gap-1 bg-white dark:bg-slate-900 ${
          isToday
            ? 'border-slate-900 dark:border-white ring-2 ring-slate-900 dark:ring-white shadow-lg'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-1 px-0.5">
          <span className={`text-xs font-black leading-none ${
            isToday ? 'text-slate-900 dark:text-white' : isSunday ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'
          }`}>
            {date.getDate()}
          </span>
          <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <Coffee className="w-2.5 h-2.5" />{assignment.off}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          {SHIFT_SLOTS.map(slot => {
            const isLive = isToday && activeSlots.includes(slot);
            return (
              <div key={slot} className="flex items-stretch gap-1 leading-none">
                <span className={`w-6 shrink-0 flex items-center justify-center rounded text-[9px] font-black ${
                  isLive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}>
                  {slot}
                </span>
                <span className={`flex-1 flex items-center justify-center py-1 rounded text-[10px] font-black uppercase tracking-wider ${GROUP_SOLID[assignment[slot]]} ${
                  isToday && !isLive ? 'opacity-45' : ''
                }`}>
                  {assignment[slot]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /** Kalender kecil satu bulan, dipakai pada tampilan tahun. */
  const MiniMonth: React.FC<{ monthIndex: number }> = ({ monthIndex }) => {
    const cells = buildMonthCells(year, monthIndex);
    const isCurrentMonth = administrativeDate.getFullYear() === year && administrativeDate.getMonth() === monthIndex;

    return (
      <div className={`rounded-2xl border p-2.5 bg-white dark:bg-slate-900 ${
        isCurrentMonth
          ? 'border-slate-900 dark:border-white shadow-md'
          : 'border-slate-200 dark:border-slate-800'
      }`}>
        <button
          type="button"
          onClick={() => { setMonth(monthIndex); setViewMode('month'); }}
          title={`Buka ${MONTHS[monthIndex]} ${year}`}
          className="w-full mb-2 px-1.5 py-1 rounded-lg text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
        >
          {MONTHS[monthIndex]}
        </button>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DOW_MINI.map((d, i) => (
            <span key={i} className={`text-center text-[11px] font-black uppercase ${
              i === 0 ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'
            }`}>
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((date, i) => {
            if (!date) return <span key={i} />;
            const isToday = isSameDay(date, administrativeDate);

            if (focusGroup) {
              const meta = DUTY[getGroupDuty(focusGroup, date)];
              return (
                <span
                  key={i}
                  title={`${date.getDate()} ${MONTHS_SHORT[monthIndex]} ${year} — ${meta.label}`}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-md border ${meta.cell} ${
                    isToday ? 'ring-2 ring-slate-900 dark:ring-white' : ''
                  }`}
                >
                  <span className="text-xs font-black leading-none">{date.getDate()}</span>
                  <span className="text-[10px] font-black leading-none tracking-tight opacity-90">{meta.short}</span>
                </span>
              );
            }

            /* Tanpa fokus grup, tiga kotak di bawah tanggal adalah grup
               pemegang Shift I, II, III berurutan dari kiri. */
            const a = getShiftAssignment(date);
            return (
              <span
                key={i}
                title={`${date.getDate()} ${MONTHS_SHORT[monthIndex]} ${year} — I: ${a.I}, II: ${a.II}, III: ${a.III}, Libur: ${a.off}`}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-md border ${
                  isToday
                    ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="text-xs font-black leading-none text-slate-600 dark:text-slate-300">
                  {date.getDate()}
                </span>
                <span className="flex w-full gap-px">
                  {SHIFT_SLOTS.map(slot => (
                    <span
                      key={slot}
                      className={`flex-1 py-0.5 rounded-sm text-[10px] font-black leading-none text-center ${GROUP_SOLID[a[slot]]}`}
                    >
                      {a[slot]}
                    </span>
                  ))}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  /* ---------------------------------------------------------------- */

  return (
    <div className="w-full flex flex-col gap-4 p-2 md:p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl text-slate-900 dark:text-slate-100">

      {/* Header, navigasi periode, dan filter grup dalam satu kartu. */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 bg-rose-500/20 text-rose-500 rounded-xl border border-rose-500/40 shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-black tracking-wide uppercase">
                Jadwal Shift
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Pilih tampilan */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {([['month', 'Bulan', CalendarDays], ['year', 'Tahun', CalendarRange]] as const).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-[background-color,color,box-shadow] cursor-pointer ${
                    viewMode === mode
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={goToday}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-sm transition-[background-color,transform] active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Hari Ini
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => shiftYear(-1)}
            title="Tahun sebelumnya"
            aria-label="Tahun sebelumnya"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {viewMode === 'month' && (
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              title="Bulan sebelumnya"
              aria-label="Bulan sebelumnya"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {viewMode === 'month' && (
            <CustomDropdown
              value={month}
              options={MONTHS.map((label, value) => ({ value, label }))}
              onChange={setMonth}
              ariaLabel="Pilih bulan"
              widthClassName="w-36"
            />
          )}

          <CustomDropdown
            value={year}
            options={YEAR_OPTIONS}
            onChange={setYear}
            ariaLabel="Pilih tahun"
            widthClassName="w-28"
          />

          {viewMode === 'month' && (
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              title="Bulan berikutnya"
              aria-label="Bulan berikutnya"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => shiftYear(1)}
            title="Tahun berikutnya"
            aria-label="Tahun berikutnya"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
          </div>

          {/* Fokus grup */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <GroupChip group={null} />
            {ALL_SHIFT_GROUPS.map(g => <GroupChip key={g} group={g} />)}
          </div>
        </div>
      </div>

      {/* Kalender ditempatkan sebelum ringkasan agar tanggal menjadi fokus utama. */}
      {viewMode === 'month' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {DOW.map((d, i) => (
                <div
                  key={d.full}
                  className={`py-1.5 text-center text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg bg-slate-100 dark:bg-slate-800 ${
                    i === 0 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="md:hidden">{d.short}</span>
                  <span className="hidden md:inline">{d.full}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {monthCells.map((date, i) => <MonthCell key={i} date={date} />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
          {MONTHS.map((_, i) => <MiniMonth key={i} monthIndex={i} />)}
        </div>
      )}

      {/* Ringkasan hari ini */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="hidden lg:flex lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-col">
          <div className="shrink-0 px-3.5 py-2 bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Hari Ini — {administrativeDate.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4">
            {SHIFT_SLOTS.map((slot, i) => {
              const isLive = activeSlots.includes(slot);
              const meta = DUTY[slot];
              return (
                <div key={slot} className={`p-3 flex flex-col justify-center gap-1.5 ${i > 0 ? 'sm:border-l border-slate-200 dark:border-slate-800' : ''} ${i >= 2 ? 'border-t sm:border-t-0 border-slate-200 dark:border-slate-800' : ''} ${i === 1 ? 'border-l sm:border-l border-slate-200 dark:border-slate-800' : ''}`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <meta.Icon className={`w-3.5 h-3.5 ${isLive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      Shift {slot}
                    </span>
                  </div>
                  <span className={`px-2 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-center ${GROUP_SOLID[todayGroups[slot]]} ${isLive ? '' : 'opacity-45'}`}>
                    Grup {todayGroups[slot]}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wide text-center">
                    {SHIFT_TIME_LABEL[slot]}
                  </span>
                </div>
              );
            })}
            <div className="p-3 flex flex-col justify-center gap-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Libur</span>
              </div>
              <span className={`px-2 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-center opacity-45 ${GROUP_SOLID[todayOff]}`}>
                Grup {todayOff}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wide text-center">Off duty</span>
            </div>
          </div>
        </div>

        {/* Rekap periode */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Rekap {periodLabel} ({statDates.length} hari)
            </span>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500">
                <th className="px-2.5 py-1.5 text-left font-black uppercase tracking-wider">Grup</th>
                {DUTY_ORDER.map(d => (
                  <th key={d} className="px-1 py-1.5 text-center font-black uppercase tracking-wider">
                    {d === 'off' ? 'Libur' : d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map(({ group, counts }) => (
                <tr
                  key={group}
                  className={`border-t border-slate-200 dark:border-slate-800 ${
                    focusGroup === group ? 'bg-slate-100 dark:bg-slate-800/70' : ''
                  }`}
                >
                  <td className="px-2.5 py-1.5">
                    <span className="flex items-center gap-1.5 font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${GROUP_DOT[group]}`} />
                      {group}
                    </span>
                  </td>
                  {DUTY_ORDER.map(d => (
                    <td key={d} className="px-1 py-1.5 text-center font-black text-slate-600 dark:text-slate-300 tabular-nums">
                      {counts[d]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
