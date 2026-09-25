import assert from 'node:assert/strict';
import test from 'node:test';
import { getNationalHoliday } from './nationalHolidays.ts';

// Lampiran A SKB 3 Menteri 1205/2026, 3/2026, 2/2026 — hari libur nasional saja.
const official2027: [string, string][] = [
  ['2027-01-01', 'Tahun Baru 2027 Masehi'],
  ['2027-01-05', 'Isra Mikraj Nabi Muhammad SAW (1448 H)'],
  ['2027-02-06', 'Tahun Baru Imlek 2578 Kongzili'],
  ['2027-03-08', 'Hari Suci Nyepi (Tahun Baru Saka 1949)'],
  ['2027-03-10', 'Idul Fitri 1448 H'],
  ['2027-03-11', 'Idul Fitri 1448 H'],
  ['2027-03-26', 'Wafat Yesus Kristus'],
  ['2027-03-28', 'Kebangkitan Yesus Kristus (Paskah)'],
  ['2027-05-01', 'Hari Buruh Internasional'],
  ['2027-05-06', 'Kenaikan Yesus Kristus'],
  ['2027-05-17', 'Idul Adha 1448 H'],
  ['2027-05-20', 'Hari Raya Waisak 2571 BE'],
  ['2027-06-01', 'Hari Lahir Pancasila'],
  ['2027-06-06', '1 Muharam Tahun Baru Islam 1449 H'],
  ['2027-08-15', 'Maulid Nabi Muhammad SAW'],
  ['2027-08-17', 'Proklamasi Kemerdekaan'],
  ['2027-12-25', 'Kelahiran Yesus Kristus'],
  ['2027-12-26', 'Isra Mikraj Nabi Muhammad SAW (1449 H)'],
];

test('menandai tepat 18 hari libur nasional 2027 berdasarkan SKB, termasuk yang akhir pekan', () => {
  assert.equal(official2027.length, 18);
  for (const [isoDate, name] of official2027) {
    const [year, month, day] = isoDate.split('-').map(Number);
    assert.equal(getNationalHoliday(new Date(year, month - 1, day)), name, isoDate);
  }
});

test('tanggal cuti bersama dan hari biasa tidak ditandai sebagai libur nasional', () => {
  for (const [year, month, day] of [[2027, 2, 5], [2027, 3, 9], [2027, 3, 12], [2027, 3, 15], [2027, 3, 25], [2027, 5, 18], [2027, 5, 19], [2027, 12, 24], [2027, 7, 2]]) {
    assert.equal(getNationalHoliday(new Date(year, month - 1, day)), undefined);
  }
});

test('penanda dibatasi tahun dan tanggal lokal, bukan tanggal UTC', () => {
  assert.equal(getNationalHoliday(new Date(2026, 0, 1)), undefined);
  assert.equal(getNationalHoliday(new Date(2028, 0, 1)), undefined);
  assert.equal(getNationalHoliday(new Date(2027, 0, 1, 23, 30)), 'Tahun Baru 2027 Masehi');
});
