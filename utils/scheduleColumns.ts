export const MIN_SCHEDULE_COLUMNS = 1;
export const MAX_SCHEDULE_COLUMNS = 10;

export const stepScheduleColumnCount = (
  current: number,
  direction: -1 | 1,
): number => Math.min(
  MAX_SCHEDULE_COLUMNS,
  Math.max(MIN_SCHEDULE_COLUMNS, current + direction),
);

/**
 * Menghitung ukuran font indikator 'CEK NOTE' agar proporsional
 * dengan lebar kolom tabel saat jumlah kolom ditambah/dikurangi.
 */
export const getNoteIndicatorFontSize = (columnsToDisplay: number): string => {
  if (columnsToDisplay <= 1) return '0.85em';
  if (columnsToDisplay === 2) return '0.80em';
  if (columnsToDisplay === 3) return '0.75em';
  if (columnsToDisplay === 4) return '0.68em';
  if (columnsToDisplay === 5) return '0.62em';
  if (columnsToDisplay === 6) return '0.56em';
  if (columnsToDisplay === 7) return '0.50em';
  if (columnsToDisplay === 8) return '0.45em';
  if (columnsToDisplay === 9) return '0.40em';
  return '0.36em';
};
