import { formatDate, getBatchDate } from './dateUtils.ts';
import type { ScheduleItem, ItemConfig } from '../types';

export interface DailyStartCounterOptions {
  baseStartTime?: Date;
  baseBatchNumber?: number;
  intervalMinutes?: number;
  itemConfigs?: Record<string, ItemConfig>;
  reactorsCount?: number;
}

/**
 * Menghitung jumlah batch non-skipped yang sudah berjalan lebih awal
 * pada tanggal produksi yang sama dengan baseStartTime (sebelum reset sequence).
 */
export const getEarlierBatchesCountOnSameDate = (
  baseStartTime: Date,
  baseBatchNumber: number,
  intervalMinutes: number,
  itemConfigs: Record<string, ItemConfig> = {},
  reactorsCount: number = 5,
  maxLookback: number = 60,
): number => {
  const targetDateKey = formatDate(getBatchDate(baseStartTime));
  let count = 0;
  let cursor = baseStartTime.getTime();
  let prevBatch = baseBatchNumber - 1;
  let reactorIndex = reactorsCount - 1;

  for (let i = 0; i < maxLookback; i++) {
    cursor -= intervalMinutes * 60000;
    const itemDate = new Date(cursor);
    const dateKey = formatDate(getBatchDate(itemDate));

    if (dateKey !== targetDateKey) {
      break;
    }

    const reactorId = ['S', 'T', 'U', 'V', 'W'][reactorIndex % 5] || 'W';
    const uniqueId = `${reactorId}-${prevBatch}`;
    const cfg = itemConfigs[uniqueId];
    const isSkipped = cfg?.isSkipped || false;

    if (!isSkipped) {
      count++;
      prevBatch--;
    }

    reactorIndex = (reactorIndex - 1 + reactorsCount) % reactorsCount;
  }

  return count;
};

/**
 * Menghitung nomor urut start harian (1, 2, 3, 4...) per tanggal produksi
 * untuk reaktor yang tidak di-skip.
 * - Berlaku untuk semua reaktor di tabel (baik yang sudah start maupun belum).
 * - Saat reset sequence, melanjutkan hitungan dari batch sebelumnya pada tanggal yang sama.
 * - Ketika tanggal produksi berganti, hitungan otomatis mereset kembali ke 1.
 */
export const assignDailyStartNumbers = (
  matrix: Record<string, ScheduleItem[]>,
  options?: DailyStartCounterOptions,
): void => {
  const allItems: ScheduleItem[] = (Object.values(matrix).flat() as ScheduleItem[])
    .filter(item => item.status !== 'skipped');

  // Urutkan berdasarkan waktu mulai (kronologis)
  allItems.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  let currentBatchDateKey = '';
  let dailyCounter = 0;

  allItems.forEach(item => {
    const batchDateKey = formatDate(getBatchDate(item.startTime));
    if (batchDateKey !== currentBatchDateKey) {
      currentBatchDateKey = batchDateKey;
      let initialOffset = 0;

      if (
        options?.baseStartTime &&
        options?.baseBatchNumber !== undefined &&
        options?.intervalMinutes &&
        options.intervalMinutes > 0 &&
        formatDate(getBatchDate(options.baseStartTime)) === batchDateKey
      ) {
        initialOffset = getEarlierBatchesCountOnSameDate(
          options.baseStartTime,
          options.baseBatchNumber,
          options.intervalMinutes,
          options.itemConfigs,
          options.reactorsCount,
        );
      }

      dailyCounter = initialOffset + 1;
    } else {
      dailyCounter++;
    }
    item.dailyStartNumber = dailyCounter;
  });
};
