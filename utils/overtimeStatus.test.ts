import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OVERTIME_TIME_PRESETS,
  getOvertimeDisplayData,
  getOvertimeDisplayPurpose,
  getOvertimeStatus,
  parseOvertimeTimePreset,
} from './overtimeStatus.ts';

const automaticEntry = {
  date: '19/09/2026',
  purpose: 'BU Harjanto',
  startTime: '19:00',
  endTime: '23:00',
  statusOverride: 'auto' as const,
};

test('preset jam lembur menyediakan lima pilihan lama', () => {
  assert.deepEqual(OVERTIME_TIME_PRESETS, [
    { value: '07:00|11:00', label: '07:00 sd 11:00', startTime: '07:00', endTime: '11:00' },
    { value: '11:00|15:00', label: '11:00 sd 15:00', startTime: '11:00', endTime: '15:00' },
    { value: '15:00|19:00', label: '15:00 sd 19:00', startTime: '15:00', endTime: '19:00' },
    { value: '19:00|23:00', label: '19:00 sd 23:00', startTime: '19:00', endTime: '23:00' },
    { value: '23:00|07:00', label: '23:00 sd 07:00', startTime: '23:00', endTime: '07:00' },
  ]);
});

test('nilai preset diubah menjadi jam mulai dan selesai', () => {
  assert.deepEqual(parseOvertimeTimePreset('15:00|19:00'), {
    startTime: '15:00',
    endTime: '19:00',
  });
  assert.equal(parseOvertimeTimePreset(''), undefined);
  assert.equal(parseOvertimeTimePreset('08:00|12:00'), undefined);
});

test('status otomatis tetap terjadwal sebelum jam lembur selesai', () => {
  assert.equal(getOvertimeStatus(automaticEntry, new Date(2026, 8, 19, 22, 59)), 'scheduled');
});

test('tanggal satu digit tetap diproses oleh status otomatis', () => {
  const entry = { ...automaticEntry, date: '7/09/2026' };
  assert.equal(getOvertimeStatus(entry, new Date(2026, 8, 8, 0, 0)), 'completed');
  assert.equal(getOvertimeStatus({ ...entry, date: '7/9/2026' }, new Date(2026, 8, 8, 0, 0)), 'completed');
});

test('status otomatis selesai tepat pada jam akhir lembur', () => {
  assert.equal(getOvertimeStatus(automaticEntry, new Date(2026, 8, 19, 23, 0)), 'completed');
});

test('jam akhir lintas tengah malam memakai tanggal berikutnya', () => {
  const overnight = { ...automaticEntry, startTime: '23:00', endTime: '07:00' };
  assert.equal(getOvertimeStatus(overnight, new Date(2026, 8, 20, 6, 59)), 'scheduled');
  assert.equal(getOvertimeStatus(overnight, new Date(2026, 8, 20, 7, 0)), 'completed');
});

test('override manual mengalahkan hasil otomatis', () => {
  assert.equal(
    getOvertimeStatus({ ...automaticEntry, statusOverride: 'scheduled' }, new Date(2026, 8, 20, 8, 0)),
    'scheduled',
  );
  assert.equal(
    getOvertimeStatus({ ...automaticEntry, statusOverride: 'completed' }, new Date(2026, 8, 18, 8, 0)),
    'completed',
  );
});

test('data lama memisahkan rentang jam dari teks tujuan', () => {
  assert.deepEqual(
    getOvertimeDisplayData({ date: '19/09/2026', purpose: 'BU Harjanto 19:00 sd 23:00' }),
    { purpose: 'BU Harjanto', startTime: '19:00', endTime: '23:00' },
  );
  assert.deepEqual(
    getOvertimeDisplayData({ date: '19/09/2026', purpose: 'BU Harjanto 7-11' }),
    { purpose: 'BU Harjanto', startTime: '07:00', endTime: '11:00' },
  );
});

test('rentang jam lama tanpa tujuan tidak ditampilkan ulang sebagai tujuan', () => {
  assert.equal(
    getOvertimeDisplayPurpose({ date: '19/09/2026', purpose: '07:00 SD 11:00' }),
    undefined,
  );
});

test('data tanpa jam tetap selesai setelah tanggalnya lewat', () => {
  const legacy = { date: '19/09/2026', purpose: 'BU Harjanto' };
  assert.equal(getOvertimeStatus(legacy, new Date(2026, 8, 19, 23, 59)), 'scheduled');
  assert.equal(getOvertimeStatus(legacy, new Date(2026, 8, 20, 0, 0)), 'completed');
});
