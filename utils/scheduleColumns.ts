export const MIN_SCHEDULE_COLUMNS = 1;
export const MAX_SCHEDULE_COLUMNS = 10;

export const stepScheduleColumnCount = (
  current: number,
  direction: -1 | 1,
): number => Math.min(
  MAX_SCHEDULE_COLUMNS,
  Math.max(MIN_SCHEDULE_COLUMNS, current + direction),
);
