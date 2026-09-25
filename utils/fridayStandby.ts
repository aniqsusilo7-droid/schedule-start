import { getOvertimeStatus, type OvertimeStatusEntry } from './overtimeStatus.ts';

/** Existing group sheets use both "JADWAL STANDBY JUMAT" and "STANDBY JUMAT". */
export const isFridayStandbyTable = (title: string): boolean =>
  /^(?:JADWAL\s+)?STANDBY\s+JUMAT$/i.test(title.trim().replace(/\s+/g, ' '));

/** Friday standby is date-only; old hidden time/backup details must not affect its styling. */
export const getFridayStandbyStatus = (entry: OvertimeStatusEntry, now?: Date) =>
  getOvertimeStatus({ date: entry.date, purpose: '' }, now);
