export type OvertimeStatus = 'scheduled' | 'completed';
export type OvertimeStatusOverride = 'auto' | OvertimeStatus;

export interface OvertimeStatusEntry {
  date: string;
  purpose: string;
  startTime?: string;
  endTime?: string;
  statusOverride?: OvertimeStatusOverride;
}

export interface OvertimeDisplayData {
  purpose: string;
  startTime?: string;
  endTime?: string;
}

export interface OvertimeTimePreset {
  value: string;
  label: string;
  startTime: string;
  endTime: string;
}

export const OVERTIME_TIME_PRESETS: OvertimeTimePreset[] = [
  { value: '07:00|11:00', label: '07:00 sd 11:00', startTime: '07:00', endTime: '11:00' },
  { value: '11:00|15:00', label: '11:00 sd 15:00', startTime: '11:00', endTime: '15:00' },
  { value: '15:00|19:00', label: '15:00 sd 19:00', startTime: '15:00', endTime: '19:00' },
  { value: '19:00|23:00', label: '19:00 sd 23:00', startTime: '19:00', endTime: '23:00' },
  { value: '23:00|07:00', label: '23:00 sd 07:00', startTime: '23:00', endTime: '07:00' },
];

export const parseOvertimeTimePreset = (
  value: string,
): Pick<OvertimeTimePreset, 'startTime' | 'endTime'> | undefined => {
  const preset = OVERTIME_TIME_PRESETS.find(option => option.value === value);
  return preset ? { startTime: preset.startTime, endTime: preset.endTime } : undefined;
};

const LEGACY_TIME_RANGE = /(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(?:sd|s\/d|[-–])\s*(\d{1,2})(?::(\d{2}))?\s*$/i;

const normalizeTime = (hour: string, minute?: string): string | undefined => {
  const h = Number(hour);
  const m = Number(minute ?? '0');
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return undefined;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const getOvertimeDisplayData = (entry: OvertimeStatusEntry): OvertimeDisplayData => {
  if (entry.startTime && entry.endTime) {
    return {
      purpose: entry.purpose.trim(),
      startTime: entry.startTime,
      endTime: entry.endTime,
    };
  }

  const match = entry.purpose.match(LEGACY_TIME_RANGE);
  if (!match) return { purpose: entry.purpose.trim() };

  const startTime = normalizeTime(match[1], match[2]);
  const endTime = normalizeTime(match[3], match[4]);
  if (!startTime || !endTime) return { purpose: entry.purpose.trim() };

  return {
    purpose: entry.purpose.slice(0, match.index).trim(),
    startTime,
    endTime,
  };
};

export const getOvertimeDisplayPurpose = (entry: OvertimeStatusEntry): string | undefined => {
  const purpose = getOvertimeDisplayData(entry).purpose;
  return purpose || undefined;
};

const parseLocalDate = (value: string): Date | undefined => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }

  return parsed;
};

const minutesFromTime = (value: string): number | undefined => {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;
  return hour * 60 + minute;
};

export const getOvertimeStatus = (
  entry: OvertimeStatusEntry,
  now: Date = new Date(),
): OvertimeStatus => {
  if (entry.statusOverride === 'scheduled' || entry.statusOverride === 'completed') {
    return entry.statusOverride;
  }

  const overtimeDate = parseLocalDate(entry.date);
  if (!overtimeDate) return 'scheduled';

  const { startTime, endTime } = getOvertimeDisplayData(entry);
  if (!startTime || !endTime) {
    const nextDay = new Date(
      overtimeDate.getFullYear(),
      overtimeDate.getMonth(),
      overtimeDate.getDate() + 1,
    );
    return now.getTime() >= nextDay.getTime() ? 'completed' : 'scheduled';
  }

  const startMinutes = minutesFromTime(startTime);
  const endMinutes = minutesFromTime(endTime);
  if (startMinutes === undefined || endMinutes === undefined) return 'scheduled';

  const crossesMidnight = endMinutes <= startMinutes;
  const completion = new Date(
    overtimeDate.getFullYear(),
    overtimeDate.getMonth(),
    overtimeDate.getDate() + (crossesMidnight ? 1 : 0),
    Math.floor(endMinutes / 60),
    endMinutes % 60,
  );

  return now.getTime() >= completion.getTime() ? 'completed' : 'scheduled';
};
