// Lampiran A SKB 3 Menteri No. 1205/2026, 3/2026, 2/2026 (hari libur nasional;
// bukan lampiran B yang berisi cuti bersama).
// https://kemenkopmk.go.id/sites/default/files/pengumuman/2026-09/SKB%20Libur%20Nasional%20dan%20Cuti%20Bersama%20Tahun%202027.pdf
// Tanggal Idulfitri dan Iduladha dapat ditetapkan lagi melalui keputusan Menag.
// Penanda 2026 yang diminta pengguna; tidak mencakup cuti bersama.
const NATIONAL_HOLIDAYS_2026: Record<string, string> = {
  '2026-12-25': 'Hari Raya Natal',
};

const NATIONAL_HOLIDAYS_2027: Record<string, string> = {
  '2027-01-01': 'Tahun Baru 2027 Masehi',
  '2027-01-05': 'Isra Mikraj Nabi Muhammad SAW (1448 H)',
  '2027-02-06': 'Tahun Baru Imlek 2578 Kongzili',
  '2027-03-08': 'Hari Suci Nyepi (Tahun Baru Saka 1949)',
  '2027-03-10': 'Idul Fitri 1448 H',
  '2027-03-11': 'Idul Fitri 1448 H',
  '2027-03-26': 'Wafat Yesus Kristus',
  '2027-03-28': 'Kebangkitan Yesus Kristus (Paskah)',
  '2027-05-01': 'Hari Buruh Internasional',
  '2027-05-06': 'Kenaikan Yesus Kristus',
  '2027-05-17': 'Idul Adha 1448 H',
  '2027-05-20': 'Hari Raya Waisak 2571 BE',
  '2027-06-01': 'Hari Lahir Pancasila',
  '2027-06-06': '1 Muharam Tahun Baru Islam 1449 H',
  '2027-08-15': 'Maulid Nabi Muhammad SAW',
  '2027-08-17': 'Proklamasi Kemerdekaan',
  '2027-12-25': 'Kelahiran Yesus Kristus',
  '2027-12-26': 'Isra Mikraj Nabi Muhammad SAW (1449 H)',
};

// Libur internal ASC adalah penanda jadwal saja, bukan hari libur nasional.
const COMPANY_HOLIDAYS: Record<string, string> = {
  '2026-12-31': 'ASC',
};

export type ShiftCalendarHoliday = {
  name: string;
  label: 'LIBUR NASIONAL' | 'LIBUR ASC';
  kind: 'national' | 'company';
};

/** Kalender sipil lokal: zona browser tidak boleh menggeser tanggal saat UTC berganti. */
export const getNationalHoliday = (date: Date): string | undefined => {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return NATIONAL_HOLIDAYS_2026[key] ?? NATIONAL_HOLIDAYS_2027[key];
};

export const getShiftCalendarHoliday = (date: Date): ShiftCalendarHoliday | undefined => {
  const national = getNationalHoliday(date);
  if (national) return { name: national, label: 'LIBUR NASIONAL', kind: 'national' };
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const company = COMPANY_HOLIDAYS[key];
  return company ? { name: company, label: 'LIBUR ASC', kind: 'company' } : undefined;
};
