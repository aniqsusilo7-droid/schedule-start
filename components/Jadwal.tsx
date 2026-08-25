import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Trash2, Edit3, RotateCcw, Save, Copy, 
  Check, X, ChevronRight, Layers, FileSpreadsheet, Sparkles, AlertCircle, Clock, User, ArrowRight,
  CheckSquare, Square, Users
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export interface OvertimeEntry {
  id: string;
  date: string; // e.g. "10/05/2026"
  purpose: string; // e.g. "BU hikmal 15-19"
  createdAt?: number;
  note?: string;
}

export interface OvertimeColumn {
  id: string;
  name: string; // e.g. "ANIQ S", "ARDIYANTO"
  entries: OvertimeEntry[]; // vertical queue of logged overtime
}

export interface OvertimeTable {
  id: string;
  title: string; // e.g. "SCHEDULE BACK UP 4 JAM"
  columns: OvertimeColumn[];
  minRows?: number; // default number of display grid rows (e.g. 10 or 15)
}

export type GroupKey = 'GRUP A' | 'GRUP B' | 'GRUP C' | 'GRUP D';
export const ALL_GROUPS: GroupKey[] = ['GRUP A', 'GRUP B', 'GRUP C', 'GRUP D'];

export type GroupTablesData = Record<GroupKey, OvertimeTable[]>;

export interface GroupTheme {
  groupKey: GroupKey;
  name: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  activeTabBg: string;
  activeTabRing: string;
  
  tableBannerBg: string;
  tableBannerText: string;
  tableBannerBorder: string;
  
  colHeaderBg: string;
  colHeaderText: string;
  
  sheetTabActiveBg: string;
  sheetTabActiveText: string;
  sheetTabActiveBorder: string;
  
  cellFilledBg: string;
  cellFilledText: string;
  cellFilledBorder: string;
}

export const GROUP_THEMES: Record<GroupKey, GroupTheme> = {
  'GRUP A': {
    groupKey: 'GRUP A',
    name: 'Grup A (Biru Cobalt)',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-500/40',
    activeTabBg: 'bg-blue-600 text-white',
    activeTabRing: 'ring-2 ring-blue-400',
    
    tableBannerBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-700 dark:to-indigo-800',
    tableBannerText: 'text-white',
    tableBannerBorder: 'border-blue-700',
    
    colHeaderBg: 'bg-sky-200 dark:bg-sky-950 hover:bg-sky-300/80 dark:hover:bg-sky-900',
    colHeaderText: 'text-sky-950 dark:text-sky-100',
    
    sheetTabActiveBg: 'bg-blue-600 text-white',
    sheetTabActiveText: 'text-white',
    sheetTabActiveBorder: 'border-blue-700',
    
    cellFilledBg: 'bg-blue-300 dark:bg-blue-600 text-slate-950 dark:text-white',
    cellFilledText: 'text-slate-950 dark:text-white',
    cellFilledBorder: 'border-blue-400 dark:border-blue-500',
  },
  'GRUP B': {
    groupKey: 'GRUP B',
    name: 'Grup B (Emerald Zamrud)',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/40',
    activeTabBg: 'bg-emerald-600 text-white',
    activeTabRing: 'ring-2 ring-emerald-400',
    
    tableBannerBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-700 dark:to-teal-800',
    tableBannerText: 'text-white',
    tableBannerBorder: 'border-emerald-700',
    
    colHeaderBg: 'bg-teal-200 dark:bg-teal-950 hover:bg-teal-300/80 dark:hover:bg-teal-900',
    colHeaderText: 'text-teal-950 dark:text-teal-100',
    
    sheetTabActiveBg: 'bg-emerald-600 text-white',
    sheetTabActiveText: 'text-white',
    sheetTabActiveBorder: 'border-emerald-700',
    
    cellFilledBg: 'bg-emerald-300 dark:bg-emerald-600 text-slate-950 dark:text-white',
    cellFilledText: 'text-slate-950 dark:text-white',
    cellFilledBorder: 'border-emerald-400 dark:border-emerald-500',
  },
  'GRUP C': {
    groupKey: 'GRUP C',
    name: 'Grup C (Purple Violet)',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-500/40',
    activeTabBg: 'bg-purple-600 text-white',
    activeTabRing: 'ring-2 ring-purple-400',
    
    tableBannerBg: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 dark:from-purple-700 dark:to-fuchsia-800',
    tableBannerText: 'text-white',
    tableBannerBorder: 'border-purple-700',
    
    colHeaderBg: 'bg-purple-200 dark:bg-purple-950 hover:bg-purple-300/80 dark:hover:bg-purple-900',
    colHeaderText: 'text-purple-950 dark:text-purple-100',
    
    sheetTabActiveBg: 'bg-purple-600 text-white',
    sheetTabActiveText: 'text-white',
    sheetTabActiveBorder: 'border-purple-700',
    
    cellFilledBg: 'bg-purple-300 dark:bg-purple-600 text-slate-950 dark:text-white',
    cellFilledText: 'text-slate-950 dark:text-white',
    cellFilledBorder: 'border-purple-400 dark:border-purple-500',
  },
  'GRUP D': {
    groupKey: 'GRUP D',
    name: 'Grup D (Amber Warm)',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/40',
    activeTabBg: 'bg-amber-500 text-slate-950',
    activeTabRing: 'ring-2 ring-amber-300',
    
    tableBannerBg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 dark:from-amber-600 dark:to-orange-700',
    tableBannerText: 'text-slate-950',
    tableBannerBorder: 'border-amber-600',
    
    colHeaderBg: 'bg-orange-200 dark:bg-orange-950 hover:bg-orange-300/80 dark:hover:bg-orange-900',
    colHeaderText: 'text-orange-950 dark:text-orange-100',
    
    sheetTabActiveBg: 'bg-amber-500 text-slate-950',
    sheetTabActiveText: 'text-slate-950',
    sheetTabActiveBorder: 'border-amber-600',
    
    cellFilledBg: 'bg-amber-300 dark:bg-amber-500/90 text-slate-950 dark:text-slate-950',
    cellFilledText: 'text-slate-950 dark:text-slate-950',
    cellFilledBorder: 'border-amber-400 dark:border-amber-600',
  }
};

const DEFAULT_PERSONNEL = ['ANIQ S', 'ARDIYANTO', 'UBAY', 'ANTONI', 'MAHFUDI'];

const DEFAULT_SAMPLE_ENTRIES: Record<string, OvertimeEntry[]> = {
  'ANIQ S': [
    { id: 'e1', date: '10/05/2026', purpose: 'BU hikmal 15-19' },
    { id: 'e2', date: '27/05/2026', purpose: 'BU pa mugo' },
    { id: 'e3', date: '26/06/2026', purpose: 'BU Grup C LC (Efek ichsan) 15-19' },
    { id: 'e4', date: '24/06/2026', purpose: 'BU Harjo 07-11' },
    { id: 'e5', date: '28/06/2026', purpose: 'BU bayu 11-15' },
    { id: 'e6', date: '06/07/2026', purpose: 'ihsan 15-19' },
    { id: 'e7', date: '20/07/2026', purpose: 'BU riki 19-23' },
  ],
  'ARDIYANTO': [
    { id: 'e8', date: '02/05/2026', purpose: 'BU zainal 11-15' },
    { id: 'e9', date: '30/05/2026', purpose: 'BU Bayu AB 11-15' },
    { id: 'e10', date: '12/06/2026', purpose: 'BU ZAENAL 19-23' },
    { id: 'e11', date: '25/06/2026', purpose: 'BU Harjo 15-19' },
    { id: 'e12', date: '27/06/2026', purpose: 'BU bayu 11-15' },
    { id: 'e13', date: '08/07/2026', purpose: 'Bay Ab 11-15' },
    { id: 'e14', date: '26/07/2026', purpose: 'BU BayuAB 11-15' },
  ],
  'UBAY': [
    { id: 'e15', date: '02/05/2026', purpose: 'BU bayu ab 11-15' },
    { id: 'e16', date: '06/06/2026', purpose: 'BU hikmal 15-19' },
    { id: 'e17', date: '16/06/2026', purpose: 'BU Grup C LC (Efek Gayuh) 15-19' },
    { id: 'e18', date: '23/06/2026', purpose: 'BU mugo 07-11' },
    { id: 'e19', date: '07/07/2026', purpose: 'BU bayu a 11-15' },
    { id: 'e20', date: '21/07/2026', purpose: 'BU Harjo 07-11' },
    { id: 'e21', date: '25/07/2026', purpose: 'BU BayuAB 11-15' },
  ],
  'ANTONI': [
    { id: 'e22', date: '16/05/2026', purpose: 'BU harjanto 7-11' },
    { id: 'e23', date: '06/06/2026', purpose: 'BU ihsan 15-19' },
    { id: 'e24', date: '17/06/2026', purpose: 'BU Harjo 15-19' },
    { id: 'e25', date: '25/06/2026', purpose: 'BU mugo 15-19' },
    { id: 'e26', date: '06/07/2026', purpose: 'mugo 15-19' },
    { id: 'e27', date: '22/07/2026', purpose: 'BU Harjo 07-11' },
  ],
  'MAHFUDI': [
    { id: 'e28', date: '16/05/2026', purpose: 'BU yogi f 19-23' },
    { id: 'e29', date: '27/05/2026', purpose: 'BU pa harjanto' },
    { id: 'e30', date: '23/06/2026', purpose: 'BU Harjo 07-11' },
    { id: 'e31', date: '24/06/2026', purpose: 'BU mugo 07-11' },
    { id: 'e32', date: '07/07/2026', purpose: 'gas check 11-15' },
    { id: 'e33', date: '24/07/2026', purpose: 'BU Harjo 15-19' },
  ]
};

const DEFAULT_INITIAL_TABLES: OvertimeTable[] = [
  {
    id: 'tbl_1',
    title: 'SCHEDULE BACK UP 4 JAM',
    minRows: 12,
    columns: DEFAULT_PERSONNEL.map((person, idx) => ({
      id: `col_${idx}_${person}`,
      name: person,
      entries: DEFAULT_SAMPLE_ENTRIES[person] || []
    }))
  },
  {
    id: 'tbl_2',
    title: 'SCHEDULE BACK UP JOB A',
    minRows: 10,
    columns: ['ANIQ S', 'ARDIYANTO', 'UBAY', 'ANTONI', 'MAHFUDI'].map((person, idx) => ({
      id: `col_joba_${idx}`,
      name: person,
      entries: []
    }))
  },
  {
    id: 'tbl_3',
    title: 'SCHEDULE KAS GRUP A',
    minRows: 10,
    columns: ['ANIQ S', 'ARDIYANTO', 'UBAY', 'ANTONI', 'MAHFUDI'].map((person, idx) => ({
      id: `col_kas_${idx}`,
      name: person,
      entries: []
    }))
  }
];

const createDefaultGroupTables = (groupLetter: string): OvertimeTable[] => [
  {
    id: `tbl_${groupLetter.replace(/\s+/g, '_').toLowerCase()}_1`,
    title: `SCHEDULE BACK UP 4 JAM (${groupLetter})`,
    minRows: 12,
    columns: ['PERSONEL 1', 'PERSONEL 2', 'PERSONEL 3', 'PERSONEL 4', 'PERSONEL 5'].map((person, idx) => ({
      id: `col_${groupLetter.replace(/\s+/g, '_').toLowerCase()}_${idx}_${Date.now()}`,
      name: person,
      entries: []
    }))
  },
  {
    id: `tbl_${groupLetter.replace(/\s+/g, '_').toLowerCase()}_2`,
    title: `SCHEDULE BACK UP JOB A (${groupLetter})`,
    minRows: 10,
    columns: ['PERSONEL 1', 'PERSONEL 2', 'PERSONEL 3', 'PERSONEL 4', 'PERSONEL 5'].map((person, idx) => ({
      id: `col_${groupLetter.replace(/\s+/g, '_').toLowerCase()}_joba_${idx}_${Date.now()}`,
      name: person,
      entries: []
    }))
  },
  {
    id: `tbl_${groupLetter.replace(/\s+/g, '_').toLowerCase()}_3`,
    title: `SCHEDULE KAS (${groupLetter})`,
    minRows: 10,
    columns: ['PERSONEL 1', 'PERSONEL 2', 'PERSONEL 3', 'PERSONEL 4', 'PERSONEL 5'].map((person, idx) => ({
      id: `col_${groupLetter.replace(/\s+/g, '_').toLowerCase()}_kas_${idx}_${Date.now()}`,
      name: person,
      entries: []
    }))
  }
];

const INITIAL_GROUPS_DATA: GroupTablesData = {
  'GRUP A': createDefaultGroupTables('GRUP A'),
  'GRUP B': createDefaultGroupTables('GRUP B'),
  'GRUP C': createDefaultGroupTables('GRUP C'),
  'GRUP D': DEFAULT_INITIAL_TABLES, // Existing tables go to GRUP D
};

const parseGroupData = (raw: any): GroupTablesData => {
  if (!raw) return INITIAL_GROUPS_DATA;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (data['GRUP D'] || data['GRUP A'] || data['GRUP B'] || data['GRUP C']) {
        return {
          'GRUP A': Array.isArray(data['GRUP A']) && data['GRUP A'].length > 0 ? data['GRUP A'] : createDefaultGroupTables('GRUP A'),
          'GRUP B': Array.isArray(data['GRUP B']) && data['GRUP B'].length > 0 ? data['GRUP B'] : createDefaultGroupTables('GRUP B'),
          'GRUP C': Array.isArray(data['GRUP C']) && data['GRUP C'].length > 0 ? data['GRUP C'] : createDefaultGroupTables('GRUP C'),
          'GRUP D': Array.isArray(data['GRUP D']) && data['GRUP D'].length > 0 ? data['GRUP D'] : DEFAULT_INITIAL_TABLES,
        };
      }
    }

    if (Array.isArray(data) && data.length > 0) {
      return {
        'GRUP A': createDefaultGroupTables('GRUP A'),
        'GRUP B': createDefaultGroupTables('GRUP B'),
        'GRUP C': createDefaultGroupTables('GRUP C'),
        'GRUP D': data, // Legacy array migrates to GRUP D!
      };
    }
  } catch (e) {
    console.error('Failed to parse group data:', e);
  }
  return INITIAL_GROUPS_DATA;
};

export const Jadwal: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState<GroupKey>('GRUP D');

  const [groupsData, setGroupsData] = useState<GroupTablesData>(() => {
    const saved = localStorage.getItem('overtime_schedule_groups') || localStorage.getItem('overtime_schedule_tables');
    return parseGroupData(saved);
  });

  const [activeTableIdPerGroup, setActiveTableIdPerGroup] = useState<Record<GroupKey, string>>({
    'GRUP A': groupsData['GRUP A']?.[0]?.id || '',
    'GRUP B': groupsData['GRUP B']?.[0]?.id || '',
    'GRUP C': groupsData['GRUP C']?.[0]?.id || '',
    'GRUP D': groupsData['GRUP D']?.[0]?.id || '',
  });

  // Current active group's tables
  const tables = groupsData[activeGroup] || [];
  const activeTableId = activeTableIdPerGroup[activeGroup] || tables[0]?.id || '';

  const setActiveTableId = (newTblId: string) => {
    setActiveTableIdPerGroup(prev => ({
      ...prev,
      [activeGroup]: newTblId
    }));
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Modal States
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTableTitle, setNewTableTitle] = useState('');
  const [tableCreationMode, setTableCreationMode] = useState<'copy' | 'custom'>('copy');

  const [isEditTitleOpen, setIsEditTitleOpen] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');

  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  // Cell Overtime Modal
  const [activeEntryModal, setActiveEntryModal] = useState<{
    columnId: string;
    personName: string;
    entryIndex?: number; // if editing existing
    entry?: OvertimeEntry; // existing entry data if editing
  } | null>(null);

  const [entryDate, setEntryDate] = useState('');
  const [entryPurpose, setEntryPurpose] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Generic Confirm Dialog Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Multi-select & Batch Delete state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedEntryKeys, setSelectedEntryKeys] = useState<string[]>([]);

  // Toggle selection key (format: "columnId:entryId")
  const toggleSelectEntry = (columnId: string, entryId: string) => {
    const key = `${columnId}:${entryId}`;
    setSelectedEntryKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Get all filled entry keys in active table
  const getAllFilledEntryKeys = () => {
    const keys: string[] = [];
    activeTable.columns.forEach(col => {
      col.entries.forEach(entry => {
        keys.push(`${col.id}:${entry.id}`);
      });
    });
    return keys;
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    const allKeys = getAllFilledEntryKeys();
    if (selectedEntryKeys.length >= allKeys.length && allKeys.length > 0) {
      setSelectedEntryKeys([]);
    } else {
      setSelectedEntryKeys(allKeys);
    }
  };

  // Delete all selected overtime entries
  const handleDeleteSelectedEntries = () => {
    if (selectedEntryKeys.length === 0) return;

    const count = selectedEntryKeys.length;
    setConfirmDialog({
      title: 'Hapus Data Terpilih',
      message: `Apakah Anda yakin ingin menghapus ${count} data lembur yang telah diceklis?`,
      onConfirm: () => {
        const updated = tables.map(t => {
          if (t.id === activeTable.id) {
            return {
              ...t,
              columns: t.columns.map(c => ({
                ...c,
                entries: c.entries.filter(e => !selectedEntryKeys.includes(`${c.id}:${e.id}`))
              }))
            };
          }
          return t;
        });

        saveTablesData(updated);
        setSelectedEntryKeys([]);
        setConfirmDialog(null);
      }
    });
  };

  // Load from Supabase on mount
  useEffect(() => {
    const loadFromDatabase = async () => {
      try {
        setIsSyncing(true);
        const { data, error } = await supabase
          .from('jadwal')
          .select('id, overtime_tables')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
           console.error("Error fetching jadwal:", error);
        }

        if (data && data.overtime_tables) {
          const parsed = parseGroupData(data.overtime_tables);
          setGroupsData(parsed);
          localStorage.setItem('overtime_schedule_groups', JSON.stringify(parsed));
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.log('Supabase read fallback to local storage:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    loadFromDatabase();
  }, []);

  // Save changes to localStorage & database
  const saveTablesData = async (newTables: OvertimeTable[]) => {
    const updatedGroups: GroupTablesData = {
      ...groupsData,
      [activeGroup]: newTables
    };

    setGroupsData(updatedGroups);
    localStorage.setItem('overtime_schedule_groups', JSON.stringify(updatedGroups));

    try {
      setIsSyncing(true);
      await supabase.from('jadwal').upsert({
        id: 1,
        overtime_tables: updatedGroups,
        updated_at: new Date().toISOString()
      });
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('Supabase save warning (fallback saved locally):', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const activeTable = tables.find(t => t.id === activeTableId) || tables[0] || {
    id: 'tbl_default',
    title: 'SCHEDULE BACK UP',
    columns: [],
    minRows: 10
  };

  // Add New Table (Sheet)
  const handleCreateTable = () => {
    if (!newTableTitle.trim()) return;
    let newCols: OvertimeColumn[] = [];

    if (tableCreationMode === 'copy' && activeTable.columns.length > 0) {
      // Duplicate personnel columns structure (empty entries)
      newCols = activeTable.columns.map(c => ({
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: c.name,
        entries: []
      }));
    } else {
      // Default fresh columns
      newCols = DEFAULT_PERSONNEL.map((person, idx) => ({
        id: `col_${Date.now()}_${idx}`,
        name: person,
        entries: []
      }));
    }

    const newTbl: OvertimeTable = {
      id: `tbl_${Date.now()}`,
      title: newTableTitle.trim().toUpperCase(),
      minRows: 10,
      columns: newCols
    };

    const updated = [...tables, newTbl];
    saveTablesData(updated);
    setActiveTableId(newTbl.id);
    setIsAddTableOpen(false);
    setNewTableTitle('');
  };

  // Delete Table
  const handleDeleteTable = (tblId: string, title: string) => {
    if (tables.length <= 1) {
      setConfirmDialog({
        title: 'Tidak Bisa Menghapus',
        message: 'Tidak dapat menghapus satu-satunya tabel yang tersisa.',
        onConfirm: () => setConfirmDialog(null)
      });
      return;
    }

    setConfirmDialog({
      title: 'Hapus Tabel',
      message: `Apakah Anda yakin ingin menghapus tabel "${title}" beserta seluruh datanya?`,
      onConfirm: () => {
        const updated = tables.filter(t => t.id !== tblId);
        saveTablesData(updated);
        setActiveTableId(updated[0].id);
        setConfirmDialog(null);
      }
    });
  };

  // Edit Table Title
  const handleSaveTitle = () => {
    if (!editTitleValue.trim()) return;
    const updated = tables.map(t => {
      if (t.id === activeTable.id) {
        return { ...t, title: editTitleValue.trim().toUpperCase() };
      }
      return t;
    });
    saveTablesData(updated);
    setIsEditTitleOpen(false);
  };

  // Add Person Column
  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    const newCol: OvertimeColumn = {
      id: `col_${Date.now()}`,
      name: newColumnName.trim().toUpperCase(),
      entries: []
    };

    const updated = tables.map(t => {
      if (t.id === activeTable.id) {
        return { ...t, columns: [...t.columns, newCol] };
      }
      return t;
    });

    saveTablesData(updated);
    setNewColumnName('');
    setIsAddColumnOpen(false);
  };

  // Edit Person Column Name
  const handleRenameColumn = (colId: string) => {
    if (!editingColumnName.trim()) return;
    const updated = tables.map(t => {
      if (t.id === activeTable.id) {
        return {
          ...t,
          columns: t.columns.map(c => c.id === colId ? { ...c, name: editingColumnName.trim().toUpperCase() } : c)
        };
      }
      return t;
    });
    saveTablesData(updated);
    setEditingColumnId(null);
  };

  // Delete Column
  const handleDeleteColumn = (colId: string, name: string) => {
    setConfirmDialog({
      title: 'Hapus Kolom Personel',
      message: `Hapus kolom personil "${name}" beserta seluruh histori lembur di kolom ini?`,
      onConfirm: () => {
        const updated = tables.map(t => {
          if (t.id === activeTable.id) {
            return { ...t, columns: t.columns.filter(c => c.id !== colId) };
          }
          return t;
        });
        saveTablesData(updated);
        setConfirmDialog(null);
      }
    });
  };

  // Reset/Clear Entire Column Entries
  const handleClearColumnEntries = (colId: string, name: string) => {
    setConfirmDialog({
      title: 'Bersihkan Data Kolom',
      message: `Bersihkan semua data lembur untuk "${name}" di tabel ini?`,
      onConfirm: () => {
        const updated = tables.map(t => {
          if (t.id === activeTable.id) {
            return {
              ...t,
              columns: t.columns.map(c => c.id === colId ? { ...c, entries: [] } : c)
            };
          }
          return t;
        });
        saveTablesData(updated);
        setConfirmDialog(null);
      }
    });
  };

  // Open Cell Entry Modal (New or Edit)
  const openCellModal = (columnId: string, personName: string, entryIndex?: number, entry?: OvertimeEntry) => {
    const today = new Date();
    const formattedToday = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    setActiveEntryModal({ columnId, personName, entryIndex, entry });
    setIsConfirmingDelete(false);
    setFormError(null);
    setEntryDate(entry ? entry.date : formattedToday);
    setEntryPurpose(entry ? entry.purpose : '');
    setEntryNote(entry ? (entry.note || '') : '');
  };

  // Save Overtime Entry
  const handleSaveEntry = () => {
    if (!activeEntryModal) return;
    if (!entryDate.trim() || !entryPurpose.trim()) {
      setFormError('Mohon isi Tanggal dan Tujuan Lembur.');
      return;
    }

    const { columnId, entryIndex } = activeEntryModal;

    const newEntryObj: OvertimeEntry = {
      id: activeEntryModal.entry?.id || `ent_${Date.now()}`,
      date: entryDate.trim(),
      purpose: entryPurpose.trim(),
      note: entryNote.trim() || undefined,
      createdAt: activeEntryModal.entry?.createdAt || Date.now()
    };

    const updated = tables.map(t => {
      if (t.id === activeTable.id) {
        return {
          ...t,
          columns: t.columns.map(c => {
            if (c.id === columnId) {
              const newEntries = [...c.entries];
              if (entryIndex !== undefined && entryIndex < newEntries.length) {
                // Update existing
                newEntries[entryIndex] = newEntryObj;
              } else {
                // Append new entry to column queue
                newEntries.push(newEntryObj);
              }
              return { ...c, entries: newEntries };
            }
            return c;
          })
        };
      }
      return t;
    });

    saveTablesData(updated);
    setActiveEntryModal(null);
    setIsConfirmingDelete(false);
  };

  // Delete Overtime Cell Entry
  const handleDeleteEntry = () => {
    if (!activeEntryModal) return;
    const { columnId, entryIndex, entry } = activeEntryModal;

    const updated = tables.map(t => {
      if (t.id === activeTable.id) {
        return {
          ...t,
          columns: t.columns.map(c => {
            if (c.id === columnId) {
              const newEntries = c.entries.filter((item, idx) => {
                if (entry && entry.id) {
                  return item.id !== entry.id;
                }
                if (entryIndex !== undefined) {
                  return idx !== entryIndex;
                }
                return true;
              });
              return { ...c, entries: newEntries };
            }
            return c;
          })
        };
      }
      return t;
    });

    saveTablesData(updated);
    setActiveEntryModal(null);
    setIsConfirmingDelete(false);
  };

  // Max number of display rows across all columns or minimum display grid rows
  const maxEntriesInTable = Math.max(
    activeTable.minRows || 12,
    ...activeTable.columns.map(c => c.entries.length)
  );

  const displayRows = Array.from({ length: maxEntriesInTable + 2 });
  const currentTheme = GROUP_THEMES[activeGroup] || GROUP_THEMES['GRUP D'];

  return (
    <div className="w-full flex flex-col gap-4 p-2 md:p-4 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      
      {/* TOP GROUP SELECTOR BAR */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 ${currentTheme.badgeBg} ${currentTheme.badgeText} rounded-xl border ${currentTheme.badgeBorder} shrink-0`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-black tracking-wide uppercase ${currentTheme.badgeText}`}>
                  PILIH GRUP OPERASIONAL
                </h2>
                <span className={`text-[10px] font-extrabold ${currentTheme.badgeBg} ${currentTheme.badgeText} border ${currentTheme.badgeBorder} px-2 py-0.5 rounded-md uppercase`}>
                  {activeGroup} Aktif
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Setiap grup ({ALL_GROUPS.join(', ')}) memiliki daftar personel, tabel, &amp; data lembur tersendiri
              </p>
            </div>
          </div>

          {/* Group Switcher Tabs */}
          <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {ALL_GROUPS.map((groupKey) => {
              const isActive = activeGroup === groupKey;
              const gTheme = GROUP_THEMES[groupKey];
              const totalEntriesInGroup = (groupsData[groupKey] || []).reduce(
                (sum, tbl) => sum + tbl.columns.reduce((cSum, col) => cSum + col.entries.length, 0),
                0
              );

              return (
                <button
                  key={groupKey}
                  type="button"
                  onClick={() => {
                    setActiveGroup(groupKey);
                    setIsSelectionMode(false);
                    setSelectedEntryKeys([]);
                  }}
                  className={`px-3 py-2 rounded-lg font-black text-xs transition-all flex flex-col items-center justify-center cursor-pointer min-w-[75px] ${
                    isActive
                      ? `${gTheme.activeTabBg} ${gTheme.activeTabRing} shadow-md active:scale-95`
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-black">{groupKey}</span>
                  <span className={`text-[10px] font-bold ${isActive ? 'opacity-90' : 'text-slate-400'}`}>
                    {totalEntriesInGroup} Data
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Action Bar & Sync Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 ${currentTheme.badgeBg} ${currentTheme.badgeText} rounded-xl border ${currentTheme.badgeBorder}`}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-wide uppercase flex items-center gap-2">
              JADWAL URUTAN LEMBUR BACKUP
              <span className={`text-[10px] ${currentTheme.sheetTabActiveBg} font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                {activeGroup}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Pencatatan urutan &amp; histori lembur tim. Data otomatis tersimpan ke database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Column Button */}
          <button
            onClick={() => setIsAddColumnOpen(true)}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Personel (Kolom)
          </button>

          {/* Add New Table/Sheet Button */}
          <button
            onClick={() => {
              setNewTableTitle(`SCHEDULE BACK UP ${tables.length + 1}`);
              setIsAddTableOpen(true);
            }}
            className={`px-3.5 py-2 ${currentTheme.sheetTabActiveBg} font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer`}
          >
            <Plus className="w-4 h-4" /> Tambah Tabel Baru
          </button>

          {/* Toggle Multi-Select Mode Button */}
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedEntryKeys([]);
            }}
            className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isSelectionMode || selectedEntryKeys.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-400'
                : 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {isSelectionMode ? 'Tutup Mode Ceklis' : 'Mode Ceklis Hapus'}
          </button>

          {/* Status Indicator */}
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {isSyncing ? '⏳ Menyimpan...' : lastSyncTime ? `✓ Terkoneksi (${lastSyncTime})` : '✓ Tersimpan'}
          </span>
        </div>
      </div>

      {/* Sheet Tabs Bar (Excel Style Bottom / Top Navigation) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-300 dark:border-slate-800 select-none no-scrollbar">
        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 shrink-0 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-slate-400" /> DAFTAR TABEL ({activeGroup}):
        </span>
        {tables.map(tbl => {
          const isActive = tbl.id === activeTable.id;
          return (
            <div
              key={tbl.id}
              className={`group relative flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer shrink-0 border-t-2 border-x ${
                isActive
                  ? `${currentTheme.sheetTabActiveBg} ${currentTheme.sheetTabActiveText} ${currentTheme.sheetTabActiveBorder} shadow-md font-extrabold scale-102 z-10`
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => setActiveTableId(tbl.id)}
            >
              <span>{tbl.title}</span>
              {tables.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTable(tbl.id, tbl.title);
                  }}
                  className={`p-1 rounded-full hover:bg-black/20 transition-colors ${isActive ? 'opacity-80 hover:opacity-100' : 'text-slate-400 hover:text-red-500'}`}
                  title="Hapus Tabel"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* MAIN SPREADSHEET CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        
        {/* EDITABLE TABLE TITLE BANNER */}
        <div className={`${currentTheme.tableBannerBg} ${currentTheme.tableBannerText} p-3 font-black text-center text-lg md:text-xl tracking-wider uppercase border-b-2 ${currentTheme.tableBannerBorder} flex items-center justify-between shadow-inner shrink-0 select-none`}>
          <div className="flex-1 text-center font-extrabold drop-shadow-xs tracking-widest flex items-center justify-center gap-2">
            <span>{activeTable.title}</span>
            <button
              onClick={() => {
                setEditTitleValue(activeTable.title);
                setIsEditTitleOpen(true);
              }}
              className="p-1 bg-black/10 hover:bg-black/20 text-current rounded-lg transition-all cursor-pointer"
              title="Ganti Judul Tabel"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BATCH DELETE CONTROL BANNER */}
        {(isSelectionMode || selectedEntryKeys.length > 0) && (
          <div className="bg-red-50 dark:bg-red-950/80 border-b-2 border-red-300 dark:border-red-800 p-3 flex flex-wrap items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs rounded-lg text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {selectedEntryKeys.length >= getAllFilledEntryKeys().length && getAllFilledEntryKeys().length > 0 ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-emerald-600" /> Batal Pilih Semua
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-500" /> Ceklis Semua Data ({getAllFilledEntryKeys().length})
                  </>
                )}
              </button>
              <span className="text-xs font-black text-red-700 dark:text-red-300">
                {selectedEntryKeys.length} data lembur diceklis
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedEntryKeys([])}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs rounded-lg cursor-pointer"
              >
                Reset Ceklis
              </button>
              <button
                type="button"
                disabled={selectedEntryKeys.length === 0}
                onClick={handleDeleteSelectedEntries}
                className={`px-4 py-1.5 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedEntryKeys.length > 0
                    ? 'bg-red-600 hover:bg-red-700 active:scale-95'
                    : 'bg-red-300 dark:bg-red-900/40 cursor-not-allowed opacity-60'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Hapus Terpilih ({selectedEntryKeys.length})
              </button>
            </div>
          </div>
        )}

        {/* TABLE GRID AREA WITH HORIZONTAL SCROLL */}
        <div className="overflow-x-auto overflow-y-auto max-h-[72vh] p-0.5">
          <table className="w-full border-collapse min-w-[700px]">
            
            {/* COLUMN HEADERS (PERSONNEL NAMES) */}
            <thead>
              <tr className={`${currentTheme.colHeaderBg} ${currentTheme.colHeaderText} divide-x divide-slate-300 dark:divide-slate-700 border-b-2 border-slate-300 dark:border-slate-700`}>
                <th className="p-2.5 text-center text-[11px] font-black w-12 bg-black/5 dark:bg-black/20 select-none">
                  NO
                </th>
                {activeTable.columns.map((col) => (
                  <th
                    key={col.id}
                    className="p-2.5 text-center font-black text-xs md:text-sm tracking-wider uppercase min-w-[150px] max-w-[220px] relative group transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1 px-1">
                      {editingColumnId === col.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingColumnName}
                            onChange={e => setEditingColumnName(e.target.value)}
                            className="w-full px-2 py-1 text-xs font-bold text-black bg-white border border-blue-500 rounded outline-none"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameColumn(col.id); }}
                          />
                          <button
                            onClick={() => handleRenameColumn(col.id)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="truncate flex-1 font-extrabold">
                            {col.name}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingColumnId(col.id);
                                setEditingColumnName(col.name);
                              }}
                              className="p-1 hover:text-blue-600 rounded"
                              title="Rename Personel"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleClearColumnEntries(col.id, col.name)}
                              className="p-1 hover:text-amber-600 rounded"
                              title="Reset/Clear Isian Lembur Kolom Ini"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            {activeTable.columns.length > 1 && (
                              <button
                                onClick={() => handleDeleteColumn(col.id, col.name)}
                                className="p-1 hover:text-red-600 rounded"
                                title="Hapus Kolom"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* TABLE ROWS (ENTRIES GRID) */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {displayRows.map((_, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="divide-x divide-slate-200 dark:divide-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Row Index Number */}
                  <td className="p-2 text-center text-[10px] font-mono font-bold text-slate-400 bg-slate-50 dark:bg-slate-900/80 select-none">
                    {rowIndex + 1}
                  </td>

                  {/* Columns for each personnel */}
                  {activeTable.columns.map((col) => {
                    const entry = col.entries[rowIndex];
                    const isFilled = !!entry;
                    const isSelected = isFilled && selectedEntryKeys.includes(`${col.id}:${entry.id}`);

                    return (
                      <td
                        key={col.id}
                        className="p-0 align-top transition-all"
                      >
                        {isFilled ? (
                          /* HIGHLIGHTED FILLED OVERTIME CELL WITH CHECKBOX */
                          <div
                            onClick={() => {
                              if (isSelectionMode) {
                                toggleSelectEntry(col.id, entry.id);
                              } else {
                                openCellModal(col.id, col.name, rowIndex, entry);
                              }
                            }}
                            className={`p-2.5 m-0.5 rounded-lg shadow-sm transition-all cursor-pointer text-center leading-snug group relative ${
                              isSelected
                                ? 'bg-red-200 dark:bg-red-950/90 text-red-950 dark:text-red-100 border-2 border-red-600 ring-2 ring-red-400 font-extrabold'
                                : `${currentTheme.cellFilledBg} font-extrabold text-xs border ${currentTheme.cellFilledBorder} hover:brightness-105 active:scale-98`
                            }`}
                            title={isSelectionMode ? "Klik untuk ceklis/unceklis" : "Klik untuk Edit / Hapus"}
                          >
                            {/* Checkbox Icon Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectEntry(col.id, entry.id);
                              }}
                              className={`absolute top-1 left-1 p-0.5 rounded transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-red-600 text-white'
                                  : 'bg-black/10 hover:bg-black/25 text-current opacity-80 group-hover:opacity-100'
                              }`}
                              title={isSelected ? "Unceklis" : "Ceklis untuk Hapus"}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5" />
                              ) : (
                                <Square className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <div className="font-mono text-[11px] tracking-tight font-black pl-4">
                              {entry.date}
                            </div>
                            <div className="mt-0.5 text-xs uppercase font-extrabold break-words">
                              {entry.purpose}
                            </div>
                            {entry.note && (
                              <div className="mt-1 text-[10px] font-medium italic truncate border-t border-black/20 dark:border-white/20 pt-0.5 opacity-90">
                                💬 {entry.note}
                              </div>
                            )}
                            {!isSelectionMode && !isSelected && (
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 p-0.5 rounded text-[9px] font-bold">
                                ✏️ Edit
                              </div>
                            )}
                          </div>
                        ) : (
                          /* EMPTY UNFILLED CELL (EXCEL GRID CELL) */
                          <div
                            onClick={() => openCellModal(col.id, col.name)}
                            className="p-2.5 m-0.5 min-h-[46px] rounded-lg border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-500/10 transition-all cursor-pointer text-center flex items-center justify-center text-slate-300 dark:text-slate-700 hover:text-blue-600 dark:hover:text-blue-400 group"
                            title={`Tambah Lembur untuk ${col.name}`}
                          >
                            <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Input
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BOTTOM QUICK ACTIONS & SUMMARY */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block border border-amber-500" /> 
              Terisi (Sudah Lembur)
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 inline-block border border-slate-300" /> 
              Kosong (Urutan Berikutnya)
            </span>
          </div>

          <div className="font-mono text-[11px] font-bold text-slate-500">
            Total Personel: <span className="text-slate-900 dark:text-white font-extrabold">{activeTable.columns.length}</span> | 
            Total Lembur Tercatat: <span className="text-amber-600 font-extrabold">{activeTable.columns.reduce((sum, c) => sum + c.entries.length, 0)}</span>
          </div>
        </div>
      </div>


      {/* ================= MODALS ================= */}

      {/* 1. ADD / EDIT OVERTIME ENTRY MODAL */}
      {activeEntryModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border-2 border-amber-500/50 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-wide uppercase flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {activeEntryModal.entryIndex !== undefined ? 'Edit Data Lembur' : 'Catat Lembur Baru'}
                </h3>
                <p className="text-xs font-bold text-amber-950/80">
                  Personel: <span className="text-white underline">{activeEntryModal.personName}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveEntryModal(null)}
                className="p-1.5 bg-black/10 hover:bg-black/20 text-slate-950 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Form Validation Error Message */}
              {formError && (
                <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Tanggal Lembur (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={entryDate}
                  onChange={e => { setEntryDate(e.target.value); setFormError(null); }}
                  placeholder="e.g. 10/05/2026"
                  className="w-full p-3 font-mono font-bold text-base bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none dark:text-white"
                  autoFocus
                />
              </div>

              {/* Purpose / Details Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Tujuan / Rincian Lembur
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={entryPurpose}
                    onChange={e => { setEntryPurpose(e.target.value); setFormError(null); }}
                    placeholder="Ketik tujuan / nama..."
                    className="w-full p-3 font-bold text-base bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none dark:text-white"
                  />
                  <select
                    onChange={e => {
                      const time = e.target.value;
                      if (!time) return;
                      const current = entryPurpose.trim();
                      const times = ["07:00 sd 11:00", "11:00 sd 15:00", "15:00 sd 19:00", "19:00 sd 23:00", "23:00 sd 07:00"];
                      let cleanCurrent = current;
                      times.forEach(t => {
                         cleanCurrent = cleanCurrent.replace(t, '').trim();
                      });
                      
                      setEntryPurpose(cleanCurrent ? `${cleanCurrent} ${time}` : time);
                      setFormError(null);
                      e.target.value = "";
                    }}
                    className="w-full p-3 font-bold text-base bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 outline-none dark:text-white cursor-pointer"
                  >
                    <option value="">+ Tambah Waktu Lembur...</option>
                    <option value="07:00 sd 11:00">07:00 sd 11:00</option>
                    <option value="11:00 sd 15:00">11:00 sd 15:00</option>
                    <option value="15:00 sd 19:00">15:00 sd 19:00</option>
                    <option value="19:00 sd 23:00">19:00 sd 23:00</option>
                    <option value="23:00 sd 07:00">23:00 sd 07:00</option>
                  </select>
                </div>
              </div>

              {/* Optional Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={entryNote}
                  onChange={e => setEntryNote(e.target.value)}
                  placeholder="e.g. Efek Gayuh / Pengganti Shift C"
                  className="w-full p-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none dark:text-white"
                />
              </div>

              {/* Action Buttons with Inline Delete Confirmation */}
              {isConfirmingDelete ? (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/70 border-2 border-red-500/60 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <div className="text-xs font-black text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                    <span>Yakin ingin menghapus data lembur ini?</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteEntry}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-lg shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Sekarang
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  {(activeEntryModal.entryIndex !== undefined || activeEntryModal.entry !== undefined) ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="px-3.5 py-2.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/70 text-red-600 dark:text-red-400 font-extrabold text-xs rounded-xl transition-all border border-red-300/50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveEntryModal(null)}
                      className="px-4 py-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEntry}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      {(activeEntryModal.entryIndex !== undefined || activeEntryModal.entry !== undefined) ? 'Simpan Perubahan' : 'Simpan Lembur'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD NEW TABLE MODAL */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border-2 border-emerald-500/50 overflow-hidden">
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-lg font-black tracking-wide uppercase flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Tambah Tabel Lembur Baru
              </h3>
              <button
                onClick={() => setIsAddTableOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Judul Tabel Baru
                </label>
                <input
                  type="text"
                  value={newTableTitle}
                  onChange={e => setNewTableTitle(e.target.value)}
                  placeholder="e.g. SCHEDULE BACK UP JOB B"
                  className="w-full p-3 font-extrabold text-base uppercase bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
                  autoFocus
                />
              </div>

              {/* Mode Selection Choice */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Struktur Kolom Personel:
                </label>
                
                <div
                  onClick={() => setTableCreationMode('copy')}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                    tableCreationMode === 'copy'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-extrabold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Copy className="w-5 h-5 shrink-0 text-emerald-500" />
                  <div className="text-xs">
                    <div className="font-extrabold">Ikuti Kolom Tabel Saat Ini</div>
                    <div className="text-[11px] font-normal opacity-80">
                      Salin daftar nama personel ({activeTable.columns.map(c => c.name).slice(0, 3).join(', ')}...) tanpa histori lembur.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setTableCreationMode('custom')}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                    tableCreationMode === 'custom'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-extrabold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sparkles className="w-5 h-5 shrink-0 text-emerald-500" />
                  <div className="text-xs">
                    <div className="font-extrabold">Gunakan Kolom Standar Default</div>
                    <div className="text-[11px] font-normal opacity-80">
                      Menggunakan 5 nama personel standar (ANIQ S, ARDIYANTO, UBAY, ANTONI, MAHFUDI).
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="px-4 py-2.5 text-slate-500 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreateTable}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
                >
                  Buat Tabel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT TABLE TITLE MODAL */}
      {isEditTitleOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border-2 border-emerald-500/50 p-5 space-y-4">
            <h3 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-emerald-500" />
              Edit Judul Tabel
            </h3>
            <input
              type="text"
              value={editTitleValue}
              onChange={e => setEditTitleValue(e.target.value)}
              className="w-full p-3 font-black text-base uppercase bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none dark:text-white"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditTitleOpen(false)}
                className="px-4 py-2 text-slate-500 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleSaveTitle}
                className="px-5 py-2 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-md"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADD PERSON COLUMN MODAL */}
      {isAddColumnOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border-2 border-sky-500/50 p-5 space-y-4">
            <h3 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-sky-500" />
              Tambah Kolom Personel
            </h3>
            <input
              type="text"
              value={newColumnName}
              onChange={e => setNewColumnName(e.target.value)}
              placeholder="Nama Personel (e.g. SUGENG)"
              className="w-full p-3 font-black text-base uppercase bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl focus:border-sky-500 outline-none dark:text-white"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddColumnOpen(false)}
                className="px-4 py-2 text-slate-500 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleAddColumn}
                className="px-5 py-2 bg-sky-600 text-white font-black text-xs rounded-xl shadow-md"
              >
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GENERIC CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border-2 border-red-500/50 p-5 space-y-4">
            <h3 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              {confirmDialog.title}
            </h3>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
