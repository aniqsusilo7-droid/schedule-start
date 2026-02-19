
export type GradeType = 'SM' | 'SLK' | 'SLP' | 'SE' | 'SR';

export interface ReactorConfig {
  id: string;
  name: string;
  color: string;
  textColor: string;
  label: string; // S, T, U, V, W
  subLabel?: string; // e.g., "USE LANCE 1"
}

export interface ItemConfig {
  overrideTime?: string; // ISO String
  isSkipped?: boolean;
  mode?: 'OPEN' | 'CLOSE';
  grade?: GradeType; // Specific grade for this batch
  note?: string;
  shiftSubsequent?: boolean; // If true, this delay affects future times
  manualDelayMinutes?: number; // Track explicitly applied delay
  stageInfo?: string; // Specific label for this batch (e.g., "Sample Blowing")
}

export interface ScheduleItem {
  id: string; // Unique ID for finding specific items (batch-reactor)
  reactorId: string;
  cycleIndex: number;
  globalIndex: number;
  batchNumber: number;
  startTime: Date;
  isToday: boolean;
  status: 'past' | 'active' | 'future' | 'skipped';
  config?: ItemConfig;
  grade: GradeType; // Resolved grade
  deltaMinutes: number; // Difference from original scheduled time
}

export interface AppState {
  baseBatchNumber: number;
  baseStartTime: string; // ISO string
  intervalHours: number;
  intervalMinutes: number;
  columnsToDisplay: number;
  itemConfigs: Record<string, ItemConfig>; // Replaced simple overrides with full config
  audioEnabled: boolean;
  currentGrade: GradeType; // Default global grade
  isStopped: boolean; // Global stop/intervention state
  reactorNotes: Record<string, string>; // Notes per reactor (S, T, U...)
  alertThresholdSeconds: number; // Seconds before start to show full screen alert
  runningText: string; // Dynamic marquee text
  isMarqueePaused: boolean; // Control running text animation
  marqueeSpeed: number; // Duration in seconds for marquee animation
  theme: 'light' | 'dark'; // UI Theme
  
  // Design / Layout Props
  layoutOrder: string[]; // Array of section IDs e.g. ['header', 'scheduler', 'catalyst']
  tableRowHeight: number; // pixel height
  tableFontSize: number; // pixel font size base
}
