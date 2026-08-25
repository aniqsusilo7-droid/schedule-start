/**
 * Rotasi shift 4 grup (A/B/C/D) untuk 3 shift + 1 grup libur.
 *
 * Diturunkan dari "2026 SHIFTING CALENDAR" (AGC Group). Kalender aslinya
 * berupa 12 blok periode tanggal 21 s/d 20 bulan berikutnya. Setelah
 * ditranskrip, polanya ternyata satu rotasi kontinu:
 *
 *   - Tiap hari tepat satu grup memegang shift I, II, III, dan satu libur.
 *   - Urutan giliran maju: (I -> II -> III -> libur) untuk tiap grup.
 *   - Panjang tiap giliran berulang 3, 2, 2 hari.
 *   - 12 giliran = 28 hari, lalu berulang.
 *
 * Diverifikasi terhadap gambar kalender pada 5 blok yang tersebar sepanjang
 * tahun (Des-Jan, Feb-Mar, Apr-Mei, Agu-Sep, Nov-Des): seluruh hari cocok,
 * termasuk bulan yang punya tanggal kosong (29-31 Februari).
 */

export type ShiftGroup = 'A' | 'B' | 'C' | 'D';
export type ShiftSlot = 'I' | 'II' | 'III';

export interface ShiftAssignment {
  /** Grup yang memegang tiap shift hari itu. */
  I: ShiftGroup;
  II: ShiftGroup;
  III: ShiftGroup;
  /** Grup yang libur hari itu. */
  off: ShiftGroup;
}

/* Empat keadaan rotasi. Indeks state maju satu tiap pergantian giliran. */
const STATES: ShiftAssignment[] = [
  { I: 'A', II: 'D', III: 'C', off: 'B' },
  { I: 'B', II: 'A', III: 'D', off: 'C' },
  { I: 'C', II: 'B', III: 'A', off: 'D' },
  { I: 'D', II: 'C', III: 'B', off: 'A' },
];

/* Hari ke-0 siklus: 20 Desember 2025, awal giliran 3 hari untuk state 0. */
const ANCHOR_Y = 2025;
const ANCHOR_M = 11; // Desember (0-based)
const ANCHOR_D = 20;

const CYCLE_DAYS = 28;

/* Bentangkan 12 giliran (panjang 3,2,2 berulang) menjadi tabel 28 hari. */
const DAY_STATE: number[] = [];
for (let run = 0; run < 12; run++) {
  const len = run % 3 === 0 ? 3 : 2;
  for (let k = 0; k < len; k++) DAY_STATE.push(run % 4);
}

/**
 * Selisih hari terhadap jangkar.
 *
 * Dihitung dari komponen tanggal lokal lewat Date.UTC, bukan selisih
 * milidetik langsung — supaya pergeseran zona waktu tidak pernah menggeser
 * hasilnya satu hari.
 */
const dayIndex = (d: Date): number => {
  const a = Date.UTC(ANCHOR_Y, ANCHOR_M, ANCHOR_D);
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86400000);
};

/** Grup yang memegang tiap shift pada tanggal tertentu. */
export const getShiftAssignment = (d: Date): ShiftAssignment => {
  const i = ((dayIndex(d) % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS;
  return STATES[DAY_STATE[i]];
};

export const SHIFT_SLOTS: ShiftSlot[] = ['I', 'II', 'III'];

/* Jam kerja tiap shift, dalam menit sejak tengah malam.
   Ada tumpang tindih 15 menit sebagai masa serah terima, sehingga pada
   rentang itu dua shift aktif bersamaan:
     06:45-07:00  Shift I  -> Shift II
     14:45-15:00  Shift II -> Shift III
     22:45-23:00  Shift III -> Shift I                                   */
const SHIFT_HOURS: Record<ShiftSlot, { start: number; end: number }> = {
  I: { start: 22 * 60 + 45, end: 7 * 60 },   // melewati tengah malam
  II: { start: 6 * 60 + 45, end: 15 * 60 },
  III: { start: 14 * 60 + 45, end: 23 * 60 },
};

/** Shift yang sedang berjalan. Dua nilai berarti sedang serah terima. */
export const getActiveShifts = (d: Date): ShiftSlot[] => {
  const m = d.getHours() * 60 + d.getMinutes();
  return SHIFT_SLOTS.filter(slot => {
    const { start, end } = SHIFT_HOURS[slot];
    /* Shift I melewati tengah malam, jadi rentangnya diuji terbalik. */
    return start <= end ? m >= start && m < end : m >= start || m < end;
  });
};
