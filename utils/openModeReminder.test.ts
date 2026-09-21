import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowOpenModeReminder } from './openModeReminder.ts';

const openItem = {
  config: { mode: 'OPEN' as const },
  status: 'future' as const,
  startTime: new Date(2026, 8, 21, 13, 56),
};

test('pengingat HWD mode OPEN tampil hanya sebelum start', () => {
  assert.equal(
    shouldShowOpenModeReminder(openItem, new Date(2026, 8, 21, 13, 55, 59)),
    true,
  );
});

test('pengingat HWD mode OPEN hilang tepat saat start', () => {
  assert.equal(
    shouldShowOpenModeReminder(
      { ...openItem, status: 'active' },
      new Date(2026, 8, 21, 13, 56),
    ),
    false,
  );
});

test('pengingat HWD mode OPEN tetap hilang setelah start', () => {
  assert.equal(
    shouldShowOpenModeReminder(
      { ...openItem, status: 'past' },
      new Date(2026, 8, 21, 14, 0),
    ),
    false,
  );
});

test('pengingat HWD tidak tampil untuk mode CLOSE', () => {
  assert.equal(
    shouldShowOpenModeReminder(
      { ...openItem, config: { mode: 'CLOSE' } },
      new Date(2026, 8, 21, 13, 55),
    ),
    false,
  );
});
