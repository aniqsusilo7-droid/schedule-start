import test from 'node:test';
import assert from 'node:assert/strict';
import { stepScheduleColumnCount } from './scheduleColumns.ts';

test('stepper menambah dan mengurangi jumlah kolom satu per klik', () => {
  assert.equal(stepScheduleColumnCount(4, 1), 5);
  assert.equal(stepScheduleColumnCount(4, -1), 3);
});

test('stepper membatasi jumlah kolom antara 1 dan 10', () => {
  assert.equal(stepScheduleColumnCount(1, -1), 1);
  assert.equal(stepScheduleColumnCount(10, 1), 10);
});
