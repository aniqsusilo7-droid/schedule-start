import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stepScheduleColumnCount,
  getNoteIndicatorFontSize,
} from './scheduleColumns.ts';

test('stepper menambah dan mengurangi jumlah kolom satu per klik', () => {
  assert.equal(stepScheduleColumnCount(4, 1), 5);
  assert.equal(stepScheduleColumnCount(4, -1), 3);
});

test('stepper membatasi jumlah kolom antara 1 dan 10', () => {
  assert.equal(stepScheduleColumnCount(1, -1), 1);
  assert.equal(stepScheduleColumnCount(10, 1), 10);
});

test('ukuran font CEK NOTE mengecil seiring bertambahnya jumlah kolom tabel', () => {
  const size1 = parseFloat(getNoteIndicatorFontSize(1));
  const size5 = parseFloat(getNoteIndicatorFontSize(5));
  const size10 = parseFloat(getNoteIndicatorFontSize(10));

  assert.ok(size1 > size5, 'Ukuran font pada 1 kolom harus lebih besar dari 5 kolom');
  assert.ok(size5 > size10, 'Ukuran font pada 5 kolom harus lebih besar dari 10 kolom');
});

