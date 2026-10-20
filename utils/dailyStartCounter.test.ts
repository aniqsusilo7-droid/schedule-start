import test from 'node:test';
import assert from 'node:assert/strict';
import { assignDailyStartNumbers } from './dailyStartCounter.ts';
import type { ScheduleItem } from '../types.ts';

const createMockItem = (
  id: string,
  startTime: Date,
  status: 'past' | 'active' | 'future' | 'skipped' = 'past',
): ScheduleItem => ({
  id,
  reactorId: id[0],
  cycleIndex: 0,
  globalIndex: 0,
  batchNumber: 4000,
  startTime,
  isToday: true,
  status,
  grade: 'SM',
  deltaMinutes: 0,
});

test('menghitung nomor urut start 1, 2, 3... pada tanggal yang sama', () => {
  const matrix: Record<string, ScheduleItem[]> = {
    S: [createMockItem('S-4001', new Date('2026-10-19T02:00:00Z'))],
    T: [createMockItem('T-4002', new Date('2026-10-19T03:30:00Z'))],
    U: [createMockItem('U-4003', new Date('2026-10-19T05:00:00Z'))],
  };

  assignDailyStartNumbers(matrix);

  assert.equal(matrix.S[0].dailyStartNumber, 1);
  assert.equal(matrix.T[0].dailyStartNumber, 2);
  assert.equal(matrix.U[0].dailyStartNumber, 3);
});

test('mereset nomor start kembali ke 1 saat tanggal produksi berganti', () => {
  const matrix: Record<string, ScheduleItem[]> = {
    S: [
      createMockItem('S-4001', new Date('2026-10-19T02:00:00Z')),
      createMockItem('S-4006', new Date('2026-10-20T02:00:00Z')),
    ],
    T: [
      createMockItem('T-4002', new Date('2026-10-19T03:30:00Z')),
      createMockItem('T-4007', new Date('2026-10-20T03:30:00Z')),
    ],
  };

  assignDailyStartNumbers(matrix);

  // Tanggal 19 Okt
  assert.equal(matrix.S[0].dailyStartNumber, 1);
  assert.equal(matrix.T[0].dailyStartNumber, 2);

  // Tanggal 20 Okt (reset ke 1)
  assert.equal(matrix.S[1].dailyStartNumber, 1);
  assert.equal(matrix.T[1].dailyStartNumber, 2);
});

test('reaktor dengan status skipped tidak diberi nomor start dan tidak menambah hitungan', () => {
  const matrix: Record<string, ScheduleItem[]> = {
    S: [createMockItem('S-4001', new Date('2026-10-19T02:00:00Z'), 'past')],
    T: [createMockItem('T-4002', new Date('2026-10-19T03:30:00Z'), 'skipped')],
    U: [createMockItem('U-4003', new Date('2026-10-19T05:00:00Z'), 'future')],
  };

  assignDailyStartNumbers(matrix);

  assert.equal(matrix.S[0].dailyStartNumber, 1);
  assert.equal(matrix.T[0].dailyStartNumber, undefined);
  // Status future tetap mendapatkan nomor urut
  assert.equal(matrix.U[0].dailyStartNumber, 2);
});

test('meneruskan hitungan nomor start setelah reset sequence pada tanggal yang sama', () => {
  // Misalnya baseStartTime baru di-reset ke pukul 05:00 (19 Okt).
  // Sebelumnya pada 19 Okt sudah ada 2 batch (pukul 02:00 dan 03:30).
  const baseStartTime = new Date('2026-10-19T05:00:00Z');
  const matrix: Record<string, ScheduleItem[]> = {
    S: [createMockItem('S-4003', baseStartTime, 'future')],
    T: [createMockItem('T-4004', new Date('2026-10-19T06:30:00Z'), 'future')],
  };

  assignDailyStartNumbers(matrix, {
    baseStartTime,
    baseBatchNumber: 4003,
    intervalMinutes: 90, // 1h 30m
  });

  // Tanggal produksi 19 Okt dimulai sejak 18 Okt pukul 21:30.
  // Dari 21:30 sampai 05:00 (interval 90m) terdapat 5 batch sebelumnya pada tanggal produksi yang sama:
  // 21:30 (18 Okt), 23:00 (18 Okt), 00:30 (19 Okt), 02:00 (19 Okt), 03:30 (19 Okt).
  // Maka batch S-4003 melanjutkan hitungan dari 6, lalu T-4004 menjadi 7.
  assert.equal(matrix.S[0].dailyStartNumber, 6);
  assert.equal(matrix.T[0].dailyStartNumber, 7);
});

