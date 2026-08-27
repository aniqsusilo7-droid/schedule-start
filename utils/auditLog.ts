import { getAdministrativeShiftDate, getActiveShifts, getShiftGroupsNow, ShiftGroup, ShiftSlot } from './shiftSchedule';

export type AuditLogInput = {
  eventType: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  beforeData?: unknown;
  afterData?: unknown;
};

export type AuditLogRow = {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  changed_at: string;
  administrative_date: string | null;
  active_shifts: ShiftSlot[] | null;
  shift_groups: Partial<Record<ShiftSlot, ShiftGroup>> | null;
  before_data: unknown;
  after_data: unknown;
};

/**
 * JSONB tidak menerima undefined dan Date perlu diserialisasi terlebih dahulu.
 * Clone juga mencegah state React yang masih berubah ikut mengubah payload log.
 */
export const cloneAuditValue = (value: unknown): unknown => {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
};

export const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Bentuk baris database dengan konteks roster saat perubahan terjadi. */
export const createAuditRow = (input: AuditLogInput, changedAt = new Date()) => {
  const groups = getShiftGroupsNow(changedAt);
  const administrativeDate = getAdministrativeShiftDate(changedAt);

  return {
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    summary: input.summary,
    changed_at: changedAt.toISOString(),
    administrative_date: formatLocalDate(administrativeDate),
    active_shifts: getActiveShifts(changedAt),
    shift_groups: groups,
    before_data: cloneAuditValue(input.beforeData),
    after_data: cloneAuditValue(input.afterData),
  };
};

export const AUDIT_EVENT_LABELS: Record<string, string> = {
  'schedule.updated': 'Schedule diubah',
  'schedule.reset': 'Schedule di-reset',
  'schedule.override_cleared': 'Override schedule dihapus',
  'silo.updated': 'Data silo diubah',
  'silo.switched': 'Silo aktif diganti',
  'steam_adjust.updated': 'Steam adjust diubah',
  'grade.changed': 'Grade diganti',
  'grade_mode.changed': 'Mode grade diubah',
  'cycle_time.updated': 'Cycle time diubah',
  'settings.updated': 'Pengaturan diubah',
};

export const auditEventLabel = (eventType: string): string =>
  AUDIT_EVENT_LABELS[eventType] || eventType.replace(/[._-]+/g, ' ');
