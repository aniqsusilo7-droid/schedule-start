import React from 'react';
import { Kesepakatan } from './Kesepakatan';
import type { ShiftGroup, ShiftSlot } from '../utils/shiftSchedule';

interface ScheduleInfoCarouselProps {
  currentGrade?: string;
  shiftGroups?: Record<ShiftSlot, ShiftGroup>;
}

export const ScheduleInfoCarousel: React.FC<ScheduleInfoCarouselProps> = ({
  currentGrade,
  shiftGroups,
}) => {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex-1">
        <Kesepakatan
          currentGrade={currentGrade}
          shiftGroups={shiftGroups}
          embedded
        />
      </div>
    </div>
  );
};
