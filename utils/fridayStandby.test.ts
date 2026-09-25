import assert from 'node:assert/strict';
import test from 'node:test';
import { isFridayStandbyTable, getFridayStandbyStatus } from './fridayStandby.ts';

test('date-only form applies to all live Standby Jumat titles, not other backup tables', () => {
  assert.equal(isFridayStandbyTable('JADWAL STANDBY JUMAT'), true);
  assert.equal(isFridayStandbyTable('STANDBY JUMAT'), true);
  assert.equal(isFridayStandbyTable('  standby   jumat '), true);
  assert.equal(isFridayStandbyTable('BACK UP 4 JAM'), false);
  assert.equal(isFridayStandbyTable('BACK UP JUMAT'), false);
});

test('Friday standby status ignores legacy time and backup fields and follows date only', () => {
  const entry = { date: '25/09/2026', purpose: 'Backup 11-15', startTime: '11:00', endTime: '15:00', note: 'Nama lama' };
  assert.equal(getFridayStandbyStatus(entry, new Date(2026, 8, 25, 23, 59)), 'scheduled');
  assert.equal(getFridayStandbyStatus(entry, new Date(2026, 8, 26, 0, 0)), 'completed');
});
