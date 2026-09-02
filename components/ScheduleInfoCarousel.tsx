import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Handshake, Pause, Play, Timer } from 'lucide-react';
import { Kesepakatan } from './Kesepakatan';
import { BackupQuotaCard } from './BackupQuotaCard';
import type { ShiftGroup, ShiftSlot } from '../utils/shiftSchedule';
import type { BackupQuotaResult } from '../utils/backupSchedule';

interface ScheduleInfoCarouselProps {
  currentGrade?: string;
  shiftGroups?: Record<ShiftSlot, ShiftGroup>;
  onOpenBackup: (target: BackupQuotaResult) => void;
}

type SlideIndex = 0 | 1;

const SLIDE_DURATION_MS = 15_000;

export const ScheduleInfoCarousel: React.FC<ScheduleInfoCarouselProps> = ({
  currentGrade,
  shiftGroups,
  onOpenBackup,
}) => {
  const [activeSlide, setActiveSlide] = useState<SlideIndex>(0);
  const [isPlaying, setIsPlaying] = useState(() => (
    typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setTimeout(() => {
      setActiveSlide(current => current === 0 ? 1 : 0);
    }, SLIDE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeSlide, isPlaying]);

  const showPrevious = useCallback(() => {
    setActiveSlide(current => current === 0 ? 1 : 0);
  }, []);

  const showNext = useCallback(() => {
    setActiveSlide(current => current === 0 ? 1 : 0);
  }, []);

  const handleEditingChange = useCallback((isEditing: boolean) => {
    if (isEditing) setIsPlaying(false);
  }, []);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div
        id="schedule-slide-agreement"
        role="tabpanel"
        aria-labelledby="schedule-tab-agreement"
        hidden={activeSlide !== 0}
        className={activeSlide === 0 ? 'schedule-slide-enter flex-1' : ''}
      >
        <Kesepakatan
          currentGrade={currentGrade}
          shiftGroups={shiftGroups}
          embedded
          onEditingChange={handleEditingChange}
        />
      </div>

      <div
        id="schedule-slide-backup"
        role="tabpanel"
        aria-labelledby="schedule-tab-backup"
        hidden={activeSlide !== 1}
        className={activeSlide === 1 ? 'schedule-slide-enter flex-1' : ''}
      >
        <BackupQuotaCard onOpenBackup={onOpenBackup} />
      </div>

      <div className="flex min-h-10 items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex min-w-0 items-center gap-1" role="tablist" aria-label="Pilihan informasi jadwal">
          <button
            id="schedule-tab-agreement"
            type="button"
            role="tab"
            aria-selected={activeSlide === 0}
            aria-controls="schedule-slide-agreement"
            onClick={() => setActiveSlide(0)}
            className={`inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2 text-[0.68em] font-black uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeSlide === 0 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700'}`}
          >
            <Handshake className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">Kesepakatan</span>
          </button>
          <button
            id="schedule-tab-backup"
            type="button"
            role="tab"
            aria-selected={activeSlide === 1}
            aria-controls="schedule-slide-backup"
            onClick={() => setActiveSlide(1)}
            className={`inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2 text-[0.68em] font-black uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${activeSlide === 1 ? 'bg-amber-400 text-amber-950' : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700'}`}
          >
            <CalendarClock className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">Jatah Backup</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span
            className="mr-0.5 inline-flex h-7 items-center gap-1 rounded-md bg-slate-200/80 px-1.5 text-[0.66em] font-black tabular-nums text-slate-500 dark:bg-slate-700/80 dark:text-slate-300"
            title="Interval slideshow 15 detik"
          >
            <Timer className="h-3 w-3" aria-hidden="true" />
            15s
          </span>
          <button
            type="button"
            onClick={showPrevious}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Slide sebelumnya"
            aria-label="Slide sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={showNext}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Slide berikutnya"
            aria-label="Slide berikutnya"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying(current => !current)}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 ${isPlaying ? 'bg-slate-700 text-white hover:bg-slate-800 focus-visible:ring-slate-500 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white' : 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-400'}`}
            title={isPlaying ? 'Jeda slideshow' : 'Jalankan slideshow'}
            aria-label={isPlaying ? 'Jeda slideshow' : 'Jalankan slideshow'}
            aria-pressed={!isPlaying}
          >
            {isPlaying
              ? <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
};
