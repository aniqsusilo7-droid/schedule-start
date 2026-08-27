import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAdministrativeShiftDate,
  getShiftGroupsNow,
} from './shiftSchedule.ts';

const at = (day: number, hour: number, minute: number) =>
  new Date(2026, 7, day, hour, minute);

test('tanggal administratif berganti tepat pukul 23:00', () => {
  assert.equal(getAdministrativeShiftDate(at(26, 22, 59)).getDate(), 26);
  assert.equal(getAdministrativeShiftDate(at(26, 23, 0)).getDate(), 27);
});

test('Shift I tanggal berikutnya masuk saat serah terima pukul 22:45', () => {
  assert.deepEqual(getShiftGroupsNow(at(26, 22, 44)), { I: 'C', II: 'B', III: 'A' });
  assert.deepEqual(getShiftGroupsNow(at(26, 22, 45)), { I: 'D', II: 'B', III: 'A' });
  assert.deepEqual(getShiftGroupsNow(at(26, 22, 59)), { I: 'D', II: 'B', III: 'A' });
});

test('seluruh roster memakai tanggal berikutnya mulai pukul 23:00', () => {
  assert.deepEqual(getShiftGroupsNow(at(26, 23, 0)), { I: 'D', II: 'C', III: 'B' });
  assert.deepEqual(getShiftGroupsNow(at(26, 23, 59)), { I: 'D', II: 'C', III: 'B' });
  assert.deepEqual(getShiftGroupsNow(at(27, 0, 0)), { I: 'D', II: 'C', III: 'B' });
});
