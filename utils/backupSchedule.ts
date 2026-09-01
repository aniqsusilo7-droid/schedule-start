export const BACKUP_GROUPS = ['GRUP A', 'GRUP B', 'GRUP C', 'GRUP D'] as const;

export type BackupGroupKey = (typeof BACKUP_GROUPS)[number];

export type BackupDurationHours = 4 | 8;

export interface BackupEntryLike {
  id?: string;
}

export interface BackupColumnLike {
  id: string;
  name: string;
  entries: BackupEntryLike[];
}

export interface BackupTableLike {
  id: string;
  title: string;
  columns: BackupColumnLike[];
}

export type BackupGroupsData = Record<BackupGroupKey, BackupTableLike[]>;

export interface BackupQuotaResult {
  group: BackupGroupKey;
  durationHours: BackupDurationHours;
  personName: string;
  tableId: string;
  columnId: string;
  rowIndex: number;
}

const EMPTY_GROUPS = (): BackupGroupsData => ({
  'GRUP A': [],
  'GRUP B': [],
  'GRUP C': [],
  'GRUP D': [],
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isBackupColumn = (value: unknown): value is BackupColumnLike => {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && Array.isArray(value.entries);
};

const isBackupTable = (value: unknown): value is BackupTableLike => {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.title === 'string'
    && Array.isArray(value.columns)
    && value.columns.every(isBackupColumn);
};

export const normalizeBackupGroups = (value: unknown): BackupGroupsData => {
  const normalized = EMPTY_GROUPS();
  if (!isRecord(value)) return normalized;

  BACKUP_GROUPS.forEach(group => {
    const tables = value[group];
    if (Array.isArray(tables)) {
      normalized[group] = tables.filter(isBackupTable);
    }
  });

  return normalized;
};

const normalizeTitle = (title: string) => title.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const findBackupTable = (
  tables: BackupTableLike[],
  durationHours: BackupDurationHours,
): BackupTableLike | null => (
  tables.find(table => normalizeTitle(table.title).includes(`BACKUP${durationHours}JAM`)) ?? null
);

export const findFourHourBackupTable = (tables: BackupTableLike[]): BackupTableLike | null => (
  findBackupTable(tables, 4)
);

export const findEightHourBackupTable = (tables: BackupTableLike[]): BackupTableLike | null => (
  findBackupTable(tables, 8)
);

export const findNextEmptyBackupSlot = (
  group: BackupGroupKey,
  tables: BackupTableLike[],
  durationHours: BackupDurationHours = 4,
): BackupQuotaResult | null => {
  const table = findBackupTable(tables, durationHours);
  if (!table || table.columns.length === 0) return null;

  const lastUsedRow = Math.max(0, ...table.columns.map(column => column.entries.length));

  for (let rowIndex = 0; rowIndex <= lastUsedRow; rowIndex += 1) {
    for (const column of table.columns) {
      if (!column.entries[rowIndex]) {
        return {
          group,
          durationHours,
          personName: column.name,
          tableId: table.id,
          columnId: column.id,
          rowIndex,
        };
      }
    }
  }

  return null;
};

export const calculateBackupQuotas = (
  groupsData: BackupGroupsData,
  durationHours: BackupDurationHours = 4,
): Record<BackupGroupKey, BackupQuotaResult | null> => ({
  'GRUP A': findNextEmptyBackupSlot('GRUP A', groupsData['GRUP A'], durationHours),
  'GRUP B': findNextEmptyBackupSlot('GRUP B', groupsData['GRUP B'], durationHours),
  'GRUP C': findNextEmptyBackupSlot('GRUP C', groupsData['GRUP C'], durationHours),
  'GRUP D': findNextEmptyBackupSlot('GRUP D', groupsData['GRUP D'], durationHours),
});
