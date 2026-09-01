import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBackupQuotas,
  findEightHourBackupTable,
  findFourHourBackupTable,
  findNextEmptyBackupSlot,
  type BackupGroupsData,
  type BackupTableLike,
} from './backupSchedule.ts';

const makeTable = (names: string[], lengths: number[], title = 'BACK UP 4 JAM'): BackupTableLike => ({
  id: 'table-4-hours',
  title,
  columns: names.map((name, columnIndex) => ({
    id: `column-${columnIndex}`,
    name,
    entries: Array.from({ length: lengths[columnIndex] }, (_, entryIndex) => ({
      id: `entry-${columnIndex}-${entryIndex}`,
    })),
  })),
});

test('finds the four-hour table across title punctuation variants', () => {
  const target = makeTable(['HIKMAL'], [0], 'BACK-UP 4 JAM');
  const other = makeTable(['HIKMAL'], [0], 'BACK UP JOB A');

  assert.equal(findFourHourBackupTable([other, target])?.id, target.id);
});

test('finds the eight-hour table with optional title suffixes', () => {
  const target = makeTable(['HIKMAL'], [0], 'BACK UP 8 JAM (LC)');
  const other = makeTable(['HIKMAL'], [0], 'BACK UP 4 JAM');

  assert.equal(findEightHourBackupTable([other, target])?.title, target.title);
});

test('selects the first empty cell in row-major order', () => {
  const table = makeTable(['ICHSAN', 'ERZA', 'ZAINAL', 'YOGI', 'GAYUH'], [2, 2, 2, 1, 1]);
  const result = findNextEmptyBackupSlot('GRUP B', [table]);

  assert.equal(result?.personName, 'YOGI');
  assert.equal(result?.durationHours, 4);
  assert.equal(result?.rowIndex, 1);
  assert.equal(result?.columnId, 'column-3');
});

test('matches the current expected eight-hour quota for every group', () => {
  const data: BackupGroupsData = {
    'GRUP A': [makeTable(['HIKMAL', 'BAYU S.', 'BAYU AB.', 'WILDAN', 'FAUZI'], [0, 0, 0, 0, 0], 'BACK UP 8 JAM (LC)')],
    'GRUP B': [makeTable(['ICHSAN', 'ERZA', 'ZAINAL', 'YOGI', 'GAYUH'], [1, 2, 3, 0, 1], 'BACK UP 8 JAM')],
    'GRUP C': [makeTable(['MUGO', 'HARJANTO', 'ARIFIN', 'ANIQ', 'M.AZIZ'], [2, 1, 2, 1, 1], 'BACK UP 8 JAM (GRUP C)')],
    'GRUP D': [makeTable(['IHSAN F', 'ARDIYANTO', 'UBAY', 'ANTONI', 'MAHFUDI'], [0, 0, 0, 0, 0], 'BACK UP 8 JAM')],
  };

  const results = calculateBackupQuotas(data, 8);

  assert.deepEqual(
    Object.fromEntries(Object.entries(results).map(([group, result]) => [group, result?.personName])),
    {
      'GRUP A': 'HIKMAL',
      'GRUP B': 'YOGI',
      'GRUP C': 'HARJANTO',
      'GRUP D': 'IHSAN F',
    },
  );
});

test('matches the current expected quota for every group', () => {
  const data: BackupGroupsData = {
    'GRUP A': [makeTable(['HIKMAL', 'BAYU S.', 'BAYU AB.', 'WILDAN', 'FAUZI'], [1, 2, 1, 1, 1])],
    'GRUP B': [makeTable(['ICHSAN', 'ERZA', 'ZAINAL', 'YOGI', 'GAYUH'], [2, 2, 2, 1, 1])],
    'GRUP C': [makeTable(['MUGO', 'HARJANTO', 'ARIFIN', 'ANIQ', 'M AZIZ'], [2, 2, 2, 1, 1])],
    'GRUP D': [makeTable(['IHSAN F', 'ARDIYANTO', 'UBAY', 'ANTONI', 'MAHFUDI'], [2, 2, 1, 1, 1])],
  };

  const results = calculateBackupQuotas(data);

  assert.deepEqual(
    Object.fromEntries(Object.entries(results).map(([group, result]) => [group, result?.personName])),
    {
      'GRUP A': 'HIKMAL',
      'GRUP B': 'YOGI',
      'GRUP C': 'ANIQ',
      'GRUP D': 'UBAY',
    },
  );
});
