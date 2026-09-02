import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { ArrowRight, CalendarClock, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  BACKUP_GROUPS,
  calculateBackupQuotas,
  normalizeBackupGroups,
  type BackupGroupsData,
  type BackupDurationHours,
  type BackupGroupKey,
  type BackupQuotaResult,
} from '../utils/backupSchedule';

interface BackupQuotaCardProps {
  onOpenBackup: (target: BackupQuotaResult) => void;
}

const GROUP_STYLES: Record<BackupGroupKey, { badge: string; row: string; button: string }> = {
  'GRUP A': {
    badge: 'border-blue-400/60 bg-blue-600 text-white',
    row: 'border-blue-200 bg-blue-50/70 dark:border-blue-800/70 dark:bg-blue-950/20',
    button: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-400',
  },
  'GRUP B': {
    badge: 'border-emerald-400/60 bg-emerald-600 text-white',
    row: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/70 dark:bg-emerald-950/20',
    button: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-400',
  },
  'GRUP C': {
    badge: 'border-purple-400/60 bg-purple-600 text-white',
    row: 'border-purple-200 bg-purple-50/70 dark:border-purple-800/70 dark:bg-purple-950/20',
    button: 'bg-purple-600 text-white hover:bg-purple-700 focus-visible:ring-purple-400',
  },
  'GRUP D': {
    badge: 'border-amber-300/70 bg-amber-400 text-amber-950',
    row: 'border-amber-200 bg-amber-50/80 dark:border-amber-800/70 dark:bg-amber-950/20',
    button: 'bg-amber-400 text-amber-950 hover:bg-amber-500 focus-visible:ring-amber-300',
  },
};

const hasTables = (groups: BackupGroupsData) => (
  BACKUP_GROUPS.some(group => groups[group].length > 0)
);

const readLocalBackupGroups = (): BackupGroupsData | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('overtime_schedule_groups')
    || localStorage.getItem('overtime_schedule_tables');
  if (!raw) return null;

  try {
    const normalized = normalizeBackupGroups(JSON.parse(raw));
    return hasTables(normalized) ? normalized : null;
  } catch {
    return null;
  }
};

const formatUpdateTime = (value: string | Date) => new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).format(new Date(value));

interface QuotaCellProps {
  durationHours: BackupDurationHours;
  group: BackupGroupKey;
  quota: BackupQuotaResult | null;
  isLoading: boolean;
  buttonClassName: string;
  onOpenBackup: (target: BackupQuotaResult) => void;
}

const QuotaCell = memo(function QuotaCell({
  durationHours,
  group,
  quota,
  isLoading,
  buttonClassName,
  onOpenBackup,
}: QuotaCellProps) {
  const personName = quota?.personName || (isLoading ? 'MEMUAT…' : 'BELUM TERSEDIA');

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md border border-white/70 bg-white/55 p-1 dark:border-slate-700/60 dark:bg-slate-900/35">
      <span className="truncate px-1 text-[1.05em] font-black uppercase tracking-wide text-slate-900 dark:text-white">
        {personName}
      </span>
      <button
        type="button"
        disabled={!quota}
        onClick={() => quota && onOpenBackup(quota)}
        className={`inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-[0.66em] font-black uppercase tracking-wide shadow-sm transition-[background-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-60 dark:focus-visible:ring-offset-slate-800 ${quota ? buttonClassName : ''}`}
        title={quota ? `Buka backup ${durationHours} jam ${group} untuk ${quota.personName}` : `Jatah backup ${durationHours} jam ${group} belum tersedia`}
        aria-label={quota ? `Update backup ${durationHours} jam ${group} untuk ${quota.personName}` : `Jatah backup ${durationHours} jam ${group} belum tersedia`}
      >
        UPDATE
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
});

export const BackupQuotaCard = memo(function BackupQuotaCard({ onOpenBackup }: BackupQuotaCardProps) {
  const [groupsData, setGroupsData] = useState<BackupGroupsData | null>(() => readLocalBackupGroups());
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('jadwal')
        .select('overtime_tables, updated_at')
        .eq('id', 1)
        .single();

      if (error) throw error;

      const normalized = normalizeBackupGroups(data?.overtime_tables);
      if (!hasTables(normalized)) throw new Error('Data jadwal backup belum tersedia.');

      setGroupsData(normalized);
      setUpdatedAt(formatUpdateTime(data?.updated_at || new Date()));
      localStorage.setItem('overtime_schedule_groups', JSON.stringify(normalized));
    } catch {
      const localGroups = readLocalBackupGroups();
      if (localGroups) {
        setGroupsData(localGroups);
        setUpdatedAt(formatUpdateTime(new Date()));
      } else {
        setErrorMessage('Gagal memuat jatah backup. Tekan ikon hitung ulang untuk mencoba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const quotas = useMemo(() => {
    if (!groupsData) return null;

    return {
      fourHours: calculateBackupQuotas(groupsData, 4),
      eightHours: calculateBackupQuotas(groupsData, 8),
    };
  }, [groupsData]);

  return (
    <div className="flex h-full min-h-[300px] flex-col overflow-hidden bg-white dark:bg-slate-800">
      <div className="flex min-h-[2.25em] items-center justify-between gap-2 bg-amber-500 px-3 py-1 text-[0.91em] font-bold uppercase tracking-tight text-slate-950">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          JATAH BACKUP
        </div>
        <button
          type="button"
          onClick={() => void refreshData()}
          disabled={isLoading}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/10 transition-colors hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-wait disabled:opacity-60"
          title="Hitung ulang jatah backup"
          aria-label="Hitung ulang jatah backup"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        <div className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-1 text-center text-[0.78em] font-black uppercase tracking-wider text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="rounded-md bg-amber-100 px-2 py-1 dark:bg-amber-900/40">GRUP</span>
          <span className="rounded-md bg-amber-100 px-2 py-1 dark:bg-amber-900/40">BACKUP 4 JAM</span>
          <span className="rounded-md bg-amber-100 px-2 py-1 dark:bg-amber-900/40">BACKUP 8 JAM</span>
        </div>

        <div className="grid flex-1 grid-rows-4 gap-1.5" aria-live="polite" aria-busy={isLoading}>
          {BACKUP_GROUPS.map(group => {
            const fourHourQuota = quotas?.fourHours[group] ?? null;
            const eightHourQuota = quotas?.eightHours[group] ?? null;
            const style = GROUP_STYLES[group];

            return (
              <div
                key={group}
                className={`grid min-h-[58px] grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5 rounded-lg border p-1.5 ${style.row}`}
              >
                <span className={`inline-flex h-8 w-full items-center justify-center whitespace-nowrap rounded-md border px-2 py-1 text-center text-[0.76em] font-black leading-none tracking-wider ${style.badge}`}>
                  {group}
                </span>
                <QuotaCell
                  durationHours={4}
                  group={group}
                  quota={fourHourQuota}
                  isLoading={isLoading}
                  buttonClassName={style.button}
                  onOpenBackup={onOpenBackup}
                />
                <QuotaCell
                  durationHours={8}
                  group={group}
                  quota={eightHourQuota}
                  isLoading={isLoading}
                  buttonClassName={style.button}
                  onOpenBackup={onOpenBackup}
                />
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <div className="rounded-md bg-red-50 px-2 py-1.5 text-center text-[0.76em] font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="text-center text-[0.72em] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Pembaruan terakhir: <span className="font-black text-slate-600 dark:text-slate-300">{updatedAt || (isLoading ? 'MEMUAT…' : '-')}</span>
        </div>
      </div>
    </div>
  );
});
