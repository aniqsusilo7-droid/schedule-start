import React, { useState, useEffect, useMemo, useRef } from 'react';
import { REACTORS } from './constants';
import { AppState, ScheduleItem, ItemConfig, GradeType } from './types';
import { addMinutes, formatDate, formatTime } from './utils/dateUtils';
import { Clock } from './components/Clock';
import { Demonomer } from './components/Demonomer';
import { Silo } from './components/Silo';
import { Settings, RefreshCw, AlertTriangle, Calendar, Hash, Volume2, VolumeX, Edit3, X, PlayCircle, Clock as ClockIcon, FileText, Ban, FastForward, PauseCircle, ArrowRightCircle, CheckCircle2, Wrench, RotateCcw, Power, Bell, Timer, ChevronDown, Info, Tag, ArrowRight, LayoutGrid, Activity, Database, Type, Sun, Moon, Pause, Play, Save } from 'lucide-react';
import { supabase } from './supabaseClient';

const GRADES: GradeType[] = ['SM', 'SLK', 'SLP', 'SE', 'SR'];
const STAGE_OPTIONS = ['Sample Blowing', 'Sample Washing', 'Sample Air Slurry'];

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<'scheduler' | 'demonomer' | 'silo'>('scheduler');
  const [now, setNow] = useState(new Date());
  
  // State for dismissed alerts (to allow closing the full screen overlay)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // State for the modal
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  
  // State for Reactor Note editing
  const [editingReactorNote, setEditingReactorNote] = useState<string | null>(null);
  const [tempReactorNote, setTempReactorNote] = useState("");
  
  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  // Modal Form State
  const [editForm, setEditForm] = useState<{
    timeValue: string;
    note: string;
    isSkipped: boolean;
    mode: 'OPEN' | 'CLOSE';
    grade: GradeType;
    shiftSubsequent: boolean;
    delayHours: number;
    delayMinutes: number;
    manualDelayMinutes: number;
    stageInfo: string;
  }>({
    timeValue: '',
    note: '',
    isSkipped: false,
    mode: 'CLOSE',
    grade: 'SM',
    shiftSubsequent: false,
    delayHours: 0,
    delayMinutes: 0,
    manualDelayMinutes: 0,
    stageInfo: ''
  });

  const [config, setConfig] = useState<AppState>({
    baseBatchNumber: 5164,
    baseStartTime: new Date().toISOString(),
    intervalHours: 1,
    intervalMinutes: 30,
    columnsToDisplay: 4,
    itemConfigs: {},
    audioEnabled: false,
    currentGrade: 'SM',
    isStopped: false,
    reactorNotes: {},
    alertThresholdSeconds: 60,
    runningText: "JIKA DELAY DIATAS 15 MENIT WAJIB ADJUST SCHEDULE!",
    isMarqueePaused: false,
    theme: 'light',
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Default closed to look cleaner on load
  const announcedBatches = useRef<Set<string>>(new Set());

  // --- Supabase Data Loading ---
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Global Settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('app_settings')
          .select('*')
          .single();

        if (settingsError) throw settingsError;

        // 2. Fetch Reactor Notes
        const { data: notesData, error: notesError } = await supabase
          .from('reactor_notes')
          .select('*');
        
        if (notesError) throw notesError;

        const notesMap: Record<string, string> = {};
        if (notesData) {
            notesData.forEach((row: any) => {
                notesMap[row.reactor_id] = row.note;
            });
        }

        // 3. Fetch Schedule Overrides (Item Configs)
        const { data: overridesData, error: overridesError } = await supabase
          .from('schedule_overrides')
          .select('*');

        if (overridesError) throw overridesError;

        const itemConfigsMap: Record<string, ItemConfig> = {};
        if (overridesData) {
            overridesData.forEach((row: any) => {
                itemConfigsMap[row.id] = {
                    overrideTime: row.override_time,
                    isSkipped: row.is_skipped,
                    mode: row.mode,
                    grade: row.grade,
                    note: row.note,
                    shiftSubsequent: row.shift_subsequent,
                    manualDelayMinutes: row.manual_delay_minutes,
                    stageInfo: row.stage_info
                };
            });
        }

        // Apply to State
        if (settingsData) {
            setConfig({
                baseBatchNumber: settingsData.base_batch_number,
                baseStartTime: settingsData.base_start_time,
                intervalHours: settingsData.interval_hours,
                intervalMinutes: settingsData.interval_minutes,
                columnsToDisplay: settingsData.columns_to_display,
                audioEnabled: settingsData.audio_enabled,
                currentGrade: settingsData.current_grade as GradeType,
                isStopped: settingsData.is_stopped,
                alertThresholdSeconds: settingsData.alert_threshold_seconds,
                runningText: settingsData.running_text,
                isMarqueePaused: settingsData.is_marquee_paused,
                theme: (settingsData.theme as 'light' | 'dark') || 'light',
                reactorNotes: notesMap,
                itemConfigs: itemConfigsMap
            });
        }
      } catch (error) {
        console.error("Error loading data from Supabase:", error);
        // Fallback or alert could go here
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // --- Real-time / Periodic Saver Helpers ---
  
  // Save specific global setting to DB
  const updateGlobalSetting = async (updates: Partial<any>) => {
      // Optimistic update
      // Logic handled in handleConfigChange, this just pushes to DB
      const { error } = await supabase
          .from('app_settings')
          .update(updates)
          .eq('id', 1);
      
      if (error) console.error("Failed to update settings:", error);
  };

  // --- Handlers ---
  const handleConfigChange = (key: keyof AppState, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));

    // Map AppState keys to DB columns
    const dbMap: Partial<Record<keyof AppState, string>> = {
        baseBatchNumber: 'base_batch_number',
        baseStartTime: 'base_start_time',
        intervalHours: 'interval_hours',
        intervalMinutes: 'interval_minutes',
        columnsToDisplay: 'columns_to_display',
        audioEnabled: 'audio_enabled',
        currentGrade: 'current_grade',
        isStopped: 'is_stopped',
        alertThresholdSeconds: 'alert_threshold_seconds',
        runningText: 'running_text',
        isMarqueePaused: 'is_marquee_paused',
        theme: 'theme'
    };

    if (dbMap[key]) {
        updateGlobalSetting({ [dbMap[key]!]: value });
    }
  };

  // Update "now" every second
  useEffect(() => {
    if (config.isStopped) return; 

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [config.isStopped]);

  const setBaseToNow = () => {
    const n = new Date();
    const coeff = 1000 * 60 * 5;
    const rounded = new Date(Math.round(n.getTime() / coeff) * coeff);
    const newTime = rounded.toISOString();
    
    handleConfigChange('baseStartTime', newTime);
  };

  const toggleAudio = () => {
    handleConfigChange('audioEnabled', !config.audioEnabled);
  };
  
  const toggleStop = () => {
    handleConfigChange('isStopped', !config.isStopped);
  };

  const toggleTheme = () => {
      handleConfigChange('theme', config.theme === 'light' ? 'dark' : 'light');
  };

  const toggleMarqueePause = () => {
      handleConfigChange('isMarqueePaused', !config.isMarqueePaused);
  };

  const handleResetSequence = async () => {
    if (window.confirm("RESET SYSTEM: Mengembalikan semua ke pengaturan awal? Data di Database akan di-reset.")) {
        const n = new Date();
        const coeff = 1000 * 60 * 5;
        const rounded = new Date(Math.round(n.getTime() / coeff) * coeff);
        
        // 1. Reset Global Settings in DB
        await supabase.from('app_settings').update({
            base_batch_number: 5164,
            base_start_time: rounded.toISOString(),
            interval_hours: 1,
            interval_minutes: 30,
            is_stopped: false,
            // Keep theme/text preferences usually, but user asked for reset
            running_text: "JIKA DELAY DIATAS 15 MENIT WAJIB ADJUST SCHEDULE!"
        }).eq('id', 1);

        // 2. Clear Overrides
        await supabase.from('schedule_overrides').delete().neq('id', 'placeholder');

        // 3. Clear Notes (Optional, maybe keep notes? Assuming reset all based on request)
        // await supabase.from('reactor_notes').delete().neq('reactor_id', 'placeholder');

        // Full Reset to Initial State in UI
        setConfig({
            baseBatchNumber: 5164,
            baseStartTime: rounded.toISOString(),
            intervalHours: 1,
            intervalMinutes: 30,
            columnsToDisplay: 4,
            itemConfigs: {},
            audioEnabled: false,
            currentGrade: 'SM',
            isStopped: false,
            reactorNotes: {},
            alertThresholdSeconds: 60,
            runningText: "JIKA DELAY DIATAS 15 MENIT WAJIB ADJUST SCHEDULE!",
            isMarqueePaused: false,
            theme: 'light',
        });
        setNow(new Date()); 
        setDismissedAlerts(new Set());
    }
  };

  // --- Reactor Note Handlers ---
  const openReactorNoteModal = (reactorId: string) => {
      setEditingReactorNote(reactorId);
      setTempReactorNote(config.reactorNotes[reactorId] || "");
  };
  
  const saveReactorNote = async () => {
      if (editingReactorNote) {
          // Optimistic UI Update
          setConfig(prev => ({
              ...prev,
              reactorNotes: {
                  ...prev.reactorNotes,
                  [editingReactorNote]: tempReactorNote
              }
          }));

          // DB Update
          const { error } = await supabase
              .from('reactor_notes')
              .upsert({ 
                  reactor_id: editingReactorNote, 
                  note: tempReactorNote,
                  updated_at: new Date()
              });
          
          if (error) console.error("Error saving note:", error);

          setEditingReactorNote(null);
      }
  };

  // --- Modal Handlers ---
  const openRescheduleModal = (item: ScheduleItem) => {
    setSelectedItem(item);
    
    // Determine current config or defaults
    const itemConfig = config.itemConfigs[item.id] || {};
    
    // Calculate local ISO string for input
    const localIso = new Date(item.startTime.getTime() - (item.startTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    setEditForm({
      timeValue: localIso,
      note: itemConfig.note || '',
      isSkipped: itemConfig.isSkipped || false,
      mode: itemConfig.mode || 'CLOSE',
      grade: itemConfig.grade || item.grade, 
      shiftSubsequent: itemConfig.shiftSubsequent || false,
      delayHours: 0,
      delayMinutes: 0,
      manualDelayMinutes: itemConfig.manualDelayMinutes || 0,
      stageInfo: itemConfig.stageInfo || ''
    });
  };

  const closeRescheduleModal = () => {
    setSelectedItem(null);
  };

  const handleModeChange = (newMode: 'OPEN' | 'CLOSE') => {
    if (newMode === editForm.mode) return;
    const currentDate = new Date(editForm.timeValue);
    let newDate = new Date(currentDate);

    if (newMode === 'OPEN') {
      newDate = addMinutes(newDate, -30);
    } else {
      newDate = addMinutes(newDate, 30);
    }
    
    const localIso = new Date(newDate.getTime() - (newDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    
    setEditForm(prev => ({
      ...prev,
      mode: newMode,
      timeValue: localIso
    }));
  };

  const applyManualDelay = () => {
    const totalMinutes = (editForm.delayHours * 60) + editForm.delayMinutes;
    if (totalMinutes === 0) return;

    const current = new Date(editForm.timeValue);
    const delayed = addMinutes(current, totalMinutes);
    const localIso = new Date(delayed.getTime() - (delayed.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    
    setEditForm(prev => ({
      ...prev,
      timeValue: localIso,
      delayHours: 0,
      delayMinutes: 0, 
      manualDelayMinutes: (prev.manualDelayMinutes || 0) + totalMinutes 
    }));
  };

  const saveReschedule = async () => {
    if (selectedItem && editForm.timeValue) {
      const newDate = new Date(editForm.timeValue);
      
      const newConfig: ItemConfig = {
        overrideTime: newDate.toISOString(),
        note: editForm.note,
        isSkipped: editForm.isSkipped,
        mode: editForm.mode,
        grade: editForm.grade !== config.currentGrade ? editForm.grade : undefined,
        shiftSubsequent: editForm.shiftSubsequent,
        manualDelayMinutes: editForm.manualDelayMinutes,
        stageInfo: editForm.stageInfo
      };

      // Optimistic Update
      setConfig(prev => ({
        ...prev,
        itemConfigs: {
          ...prev.itemConfigs,
          [selectedItem.id]: newConfig
        }
      }));

      // DB Upsert
      const { error } = await supabase
          .from('schedule_overrides')
          .upsert({
              id: selectedItem.id,
              override_time: newConfig.overrideTime,
              is_skipped: newConfig.isSkipped,
              mode: newConfig.mode,
              grade: newConfig.grade,
              note: newConfig.note,
              shift_subsequent: newConfig.shiftSubsequent,
              manual_delay_minutes: newConfig.manualDelayMinutes,
              stage_info: newConfig.stageInfo,
              updated_at: new Date()
          });

      if (error) console.error("Error saving override:", error);

      closeRescheduleModal();
    }
  };

  const clearOverride = async () => {
    if (selectedItem) {
      // Optimistic
      const newConfigs = { ...config.itemConfigs };
      delete newConfigs[selectedItem.id];
      setConfig(prev => ({ ...prev, itemConfigs: newConfigs }));

      // DB Delete
      const { error } = await supabase
          .from('schedule_overrides')
          .delete()
          .eq('id', selectedItem.id);
      
      if (error) console.error("Error clearing override:", error);

      closeRescheduleModal();
    }
  };

  // --- Logic: Generate Matrix ---
  const { scheduleMatrix, nextStartParams } = useMemo(() => {
    const matrix: Record<string, ScheduleItem[]> = {};
    const baseDate = new Date(config.baseStartTime);
    const totalIntervalMinutes = (config.intervalHours * 60) + config.intervalMinutes;

    let currentBatch = config.baseBatchNumber;
    let sequenceCursor = baseDate.getTime();
    let globalIndex = 0;

    REACTORS.forEach(r => matrix[r.id] = []);

    for (let col = 0; col < config.columnsToDisplay; col++) {
      for (let rIndex = 0; rIndex < REACTORS.length; rIndex++) {
        const reactor = REACTORS[rIndex];
        const uniqueId = `${reactor.id}-${currentBatch}`;
        const itemConfig = config.itemConfigs[uniqueId];

        let originalTime = new Date(sequenceCursor);
        let effectiveTime = originalTime;

        if (itemConfig?.overrideTime) {
            const overrideDate = new Date(itemConfig.overrideTime);
            if (itemConfig.shiftSubsequent) {
                const diff = overrideDate.getTime() - effectiveTime.getTime();
                sequenceCursor += diff; 
            }
            effectiveTime = overrideDate;
        }

        const deltaMinutes = Math.round((effectiveTime.getTime() - originalTime.getTime()) / 60000);
        let status: 'past' | 'active' | 'future' | 'skipped' = 'future';
        const isSkipped = itemConfig?.isSkipped || false;

        if (isSkipped) {
            status = 'skipped';
        } else {
            const diffSeconds = (now.getTime() - effectiveTime.getTime()) / 1000;
            if (diffSeconds > 60) {
                status = 'past';
            } else if (diffSeconds >= -10 && diffSeconds <= 60) {
                status = 'active'; 
            }
        }

        matrix[reactor.id].push({
          id: uniqueId,
          reactorId: reactor.id,
          cycleIndex: col,
          globalIndex: globalIndex,
          batchNumber: currentBatch, 
          startTime: effectiveTime,
          isToday: effectiveTime.toDateString() === now.toDateString(),
          status: status,
          config: itemConfig,
          grade: itemConfig?.grade || config.currentGrade,
          deltaMinutes: deltaMinutes
        });

        if (!isSkipped) {
            sequenceCursor += (totalIntervalMinutes * 60000);
            currentBatch++;
        }
        
        globalIndex++;
      }
    }
    
    return { 
        scheduleMatrix: matrix, 
        nextStartParams: { 
            batch: currentBatch, 
            time: new Date(sequenceCursor).toISOString() 
        } 
    };
  }, [config, now]);

  const isScheduleCompleted = useMemo(() => {
    const allItems = Object.values(scheduleMatrix).flat();
    if (allItems.length === 0) return false;
    return allItems.every(item => item.status === 'past' || item.status === 'skipped');
  }, [scheduleMatrix]);

  // --- Auto Reset / Advance Logic ---
  useEffect(() => {
     if (isScheduleCompleted && !config.isStopped && !isLoading) {
         const timer = setTimeout(() => {
             // Calculate new state
             const newBatch = nextStartParams.batch;
             const newTime = nextStartParams.time;
             
             // Update DB
             updateGlobalSetting({
                 base_batch_number: newBatch,
                 base_start_time: newTime
             });

             // Update Local
             setConfig(prev => {
                 const cleanedConfigs = { ...prev.itemConfigs };
                 Object.keys(cleanedConfigs).forEach(key => {
                    const parts = key.split('-');
                    if (parts.length === 2) {
                        const batchNum = parseInt(parts[1]);
                        if (!isNaN(batchNum) && batchNum < nextStartParams.batch) {
                            delete cleanedConfigs[key];
                            // Also clean from DB? Maybe in a background job or just let it grow.
                            // For this demo, we won't auto-delete from DB to keep history.
                        }
                    }
                 });

                 return {
                    ...prev,
                    baseBatchNumber: newBatch,
                    baseStartTime: newTime,
                    itemConfigs: cleanedConfigs
                 };
             });
             
             announcedBatches.current.clear();
             setDismissedAlerts(new Set());
         }, 3000); 
         return () => clearTimeout(timer);
     }
  }, [isScheduleCompleted, nextStartParams, config.isStopped, isLoading]);

  // ... [Audio Logic omitted for brevity, logic remains same] ...
   useEffect(() => {
    if (!config.audioEnabled || config.isStopped) return;

    Object.values(scheduleMatrix).flat().forEach(item => {
        if (item.status === 'active' && !announcedBatches.current.has(item.id)) {
            const modeText = item.config?.mode === 'OPEN' ? 'Mode Open.' : '';
            const utterance = new SpeechSynthesisUtterance();
            utterance.text = `Perhatian. Waktunya Start Reaktor ${item.reactorId}. Batch ${item.batchNumber}. Grade ${item.grade}. ${modeText}`;
            utterance.lang = 'id-ID';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
            announcedBatches.current.add(item.id);
        }
    });

    if (announcedBatches.current.size > 50) {
        announcedBatches.current.clear();
    }
  }, [scheduleMatrix, config.audioEnabled, config.isStopped]);


  // ... [Full Screen Alert Logic omitted for brevity, remains same] ...
  const fullScreenAlertItem = useMemo(() => {
      if (config.isStopped || config.alertThresholdSeconds <= 0) return null;
      const allItems = Object.values(scheduleMatrix).flat();
      const impendingItem = allItems.find(item => {
          if (item.status === 'skipped' || item.status === 'past') return false;
          if (dismissedAlerts.has(item.id)) return false;
          const secondsUntilStart = (item.startTime.getTime() - now.getTime()) / 1000;
          return secondsUntilStart > 0 && secondsUntilStart <= config.alertThresholdSeconds;
      });
      return impendingItem || null;
  }, [scheduleMatrix, now, config.isStopped, config.alertThresholdSeconds, dismissedAlerts]);

  if (isLoading) {
      return (
          <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
              <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <div className="text-slate-500 font-bold animate-pulse">Connecting to Supabase...</div>
          </div>
      );
  }

  return (
    <div className={`h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-sm relative transition-colors duration-300 overflow-hidden ${config.theme}`}>
      
      {/* ... [Full Screen Alert Overlay] ... */}
      {fullScreenAlertItem && (
          <div className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
              <button 
                  onClick={() => setDismissedAlerts(prev => new Set(prev).add(fullScreenAlertItem.id))}
                  className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm group"
              >
                  <X className="w-8 h-8 opacity-70 group-hover:opacity-100" />
              </button>
              <div className="animate-pulse flex flex-col items-center">
                  <AlertTriangle className="w-32 h-32 mb-8 text-yellow-300" />
                  <h1 className="text-6xl font-black tracking-tighter mb-4">PREPARE TO START</h1>
                  <div className="bg-white text-red-600 px-12 py-6 rounded-2xl shadow-xl flex flex-col items-center mb-8">
                      <span className="text-2xl font-bold uppercase tracking-widest text-slate-500">REACTOR</span>
                      <span className="text-9xl font-black">{fullScreenAlertItem.reactorId}</span>
                  </div>
                  <div className="flex gap-12">
                      <div className="flex flex-col items-center">
                          <span className="text-xl font-bold opacity-80">BATCH</span>
                          <span className="text-5xl font-mono font-black">{fullScreenAlertItem.batchNumber}</span>
                      </div>
                      <div className="flex flex-col items-center">
                          <span className="text-xl font-bold opacity-80">TIME</span>
                          <span className="text-5xl font-mono font-black">{formatTime(fullScreenAlertItem.startTime)}</span>
                      </div>
                  </div>
                  <div className="mt-12 text-2xl font-bold animate-bounce text-yellow-300 bg-red-800/50 px-6 py-2 rounded-full mb-8">
                      STARTING IN {Math.ceil((fullScreenAlertItem.startTime.getTime() - now.getTime()) / 1000)} SECONDS
                  </div>
                  <button 
                    onClick={() => setDismissedAlerts(prev => new Set(prev).add(fullScreenAlertItem.id))}
                    className="px-8 py-3 bg-white text-red-600 rounded-full font-black hover:bg-red-50 transition-colors shadow-lg flex items-center gap-2 transform hover:scale-105 active:scale-95 animate-none"
                  >
                      <X className="w-5 h-5" /> DISMISS ALERT
                  </button>
              </div>
          </div>
      )}

      {/* ... [Cycle Completed Banner] ... */}
       {isScheduleCompleted && !config.isStopped && currentView === 'scheduler' && (
        <div className="bg-emerald-600 text-white p-3 text-center absolute top-0 left-0 right-0 z-50 shadow-lg animate-in slide-in-from-top flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-2">
                <FastForward className="w-6 h-6 animate-pulse" />
                <span className="font-bold text-lg tracking-wide animate-pulse">SEQUENCE COMPLETE</span>
            </div>
            <div className="bg-emerald-700/50 px-4 py-1 rounded-lg flex items-center gap-4 border border-emerald-500">
                <span className="text-xs uppercase font-bold opacity-80">NEXT START PREDICTION</span>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] opacity-70">BATCH</span>
                        <span className="text-xl font-mono font-black text-yellow-300">{nextStartParams.batch}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-50" />
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] opacity-70">TIME</span>
                        <span className="text-xl font-mono font-black text-white">{formatTime(new Date(nextStartParams.time))}</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ... [Stopped Banner] ... */}
       {config.isStopped && (
        <div className="bg-red-600 text-white p-4 text-center absolute top-0 left-0 right-0 z-50 shadow-2xl flex flex-col items-center justify-center">
            <div className="flex items-center gap-3 animate-pulse">
                <Ban className="w-8 h-8" />
                <span className="font-black text-2xl tracking-widest">SYSTEM STOPPED</span>
            </div>
            <p className="text-red-100 font-mono text-sm mt-1">ALL INTERVALS & ALERTS FROZEN</p>
        </div>
      )}

      {/* --- Header --- */}
      <header className="flex-none bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 relative z-20 transition-colors duration-300">
        
        {/* Running Text Banner */}
        <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-100 py-1 border-b border-yellow-200 dark:border-yellow-800 overflow-hidden relative flex items-center h-8 transition-colors">
            {/* Gradients */}
            <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-yellow-100 dark:from-slate-900 to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-yellow-100 dark:from-slate-900 to-transparent pointer-events-none"></div>
            
            <div className="flex whitespace-nowrap w-full">
                <div className={`flex shrink-0 animate-marquee items-center min-w-full ${config.isMarqueePaused ? 'paused' : ''}`}>
                    {Array(5).fill(null).map((_, i) => (
                        <span key={i} className="flex items-center gap-2 mx-8 font-black text-xs uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4" />
                            {config.runningText}
                        </span>
                    ))}
                </div>
                <div className={`flex shrink-0 animate-marquee items-center min-w-full ${config.isMarqueePaused ? 'paused' : ''}`} aria-hidden="true">
                    {Array(5).fill(null).map((_, i) => (
                        <span key={i + 10} className="flex items-center gap-2 mx-8 font-black text-xs uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4" />
                            {config.runningText}
                        </span>
                    ))}
                </div>
            </div>
        </div>

        <div className="w-full px-4 py-2">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
            
            {/* Left: Title & Nav */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter flex items-center gap-2 leading-none">
                  <span className="text-blue-700 dark:text-blue-400">SCHEDULE</span> START
                </h1>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest mt-0.5">REAKTOR PVC 5</span>
              </div>
            </div>

            {/* Right: Controls & View Switcher */}
            <div className="flex items-center gap-4 flex-wrap justify-end">
                
                {/* View Switcher Pill */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setCurrentView('scheduler')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all flex items-center gap-1 ${currentView === 'scheduler' ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}>
                        <LayoutGrid className="w-3 h-3" /> Scheduler
                    </button>
                    <button onClick={() => setCurrentView('demonomer')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all flex items-center gap-1 ${currentView === 'demonomer' ? 'bg-white dark:bg-slate-600 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}>
                        <Activity className="w-3 h-3" /> Demonomer
                    </button>
                     <button onClick={() => setCurrentView('silo')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all flex items-center gap-1 ${currentView === 'silo' ? 'bg-white dark:bg-slate-600 text-cyan-700 dark:text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}>
                        <Database className="w-3 h-3" /> Silo
                    </button>
                </div>

                {/* Interval Display */}
                <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">INTERVAL</span>
                    <div className="text-xl font-mono font-black text-gray-800 dark:text-white bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded shadow-inner border border-blue-300 dark:border-blue-700 tracking-wider leading-none">
                        {config.intervalHours.toString().padStart(2, '0')}:{config.intervalMinutes.toString().padStart(2, '0')}
                    </div>
                </div>

                {/* Current Time (Large) */}
                <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">TIME</span>
                    <div className="scale-75 origin-top">
                        <Clock />
                    </div>
                </div>

                {/* Global Grade Selector */}
                {currentView === 'scheduler' && (
                  <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase px-2 mb-0.5 tracking-widest">GRADE</span>
                      <div className="flex gap-1">
                          {GRADES.map(g => (
                              <button key={g} onClick={() => handleConfigChange('currentGrade', g)} className={`px-2 py-1 text-xs font-black rounded transition-all shadow-sm ${config.currentGrade === g ? 'bg-blue-600 text-white shadow-blue-200 ring-1 ring-blue-300 dark:ring-blue-500' : 'bg-white dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-600'}`}>
                                  {g}
                              </button>
                          ))}
                      </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                    <button onClick={toggleAudio} className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg font-bold border transition-all ${config.audioEnabled ? 'bg-green-100 text-green-700 border-green-400 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700'}`} title="Toggle Voice">
                        {config.audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                     <button onClick={toggleTheme} className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg font-bold border transition-all ${config.theme === 'dark' ? 'bg-slate-800 text-yellow-300 border-slate-600' : 'bg-yellow-50 text-orange-500 border-orange-200'}`} title="Toggle Theme">
                        {config.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </button>

                    <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg font-bold border transition-all ${isSettingsOpen ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`} title="Settings">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>
          </div>
        </div>

        {isSettingsOpen && (
          <div className="absolute top-full left-0 right-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 animate-in slide-in-from-top-2 duration-200 transition-colors z-40 shadow-2xl">
            <div className="w-full px-4 mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* ... [Next Sequence Preview] ... */}
              <div className="md:col-span-1 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 border border-indigo-100 dark:border-slate-700 rounded-lg p-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-bl text-[9px] font-bold uppercase">Predicted</div>
                  <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase flex items-center gap-1 mb-2">
                      <ArrowRightCircle className="w-3 h-3" /> Next Sequence (S)
                  </label>
                  <div className="flex justify-between items-end">
                      <div>
                          <span className="text-[10px] text-slate-400 font-bold block">NEXT BATCH</span>
                          <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">{nextStartParams.batch}</span>
                      </div>
                      <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block">NEXT TIME</span>
                          <span className="text-xl font-bold font-mono text-slate-700 dark:text-slate-300">{formatTime(new Date(nextStartParams.time))}</span>
                          <span className="text-[9px] text-slate-400 block">{formatDate(new Date(nextStartParams.time))}</span>
                      </div>
                  </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Start Batch #
                </label>
                <input 
                  type="number" 
                  value={config.baseBatchNumber}
                  onChange={(e) => handleConfigChange('baseBatchNumber', parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> First Reactor Start (S)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="datetime-local" 
                    value={config.baseStartTime.slice(0, 16)}
                    onChange={(e) => handleConfigChange('baseStartTime', e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button onClick={setBaseToNow} className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 transition-colors" title="Set to Now">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ... [Interval Inputs] ... */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Interval (HH:MM)</label>
                <div className="flex gap-2 items-center">
                  <input type="number" min="0" max="23" value={config.intervalHours} onChange={(e) => handleConfigChange('intervalHours', parseInt(e.target.value) || 0)} className="w-16 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 text-lg font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none" />
                  <span className="font-bold dark:text-white">:</span>
                  <input type="number" min="0" max="59" value={config.intervalMinutes} onChange={(e) => handleConfigChange('intervalMinutes', parseInt(e.target.value) || 0)} className="w-16 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 text-lg font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              
              {/* ... [View Cycles Input] ... */}
               <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">View Cycles</label>
                <input type="number" min="1" max="10" value={config.columnsToDisplay} onChange={(e) => handleConfigChange('columnsToDisplay', parseInt(e.target.value) || 1)} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

               {/* Full Screen Alert Setting */}
               <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Bell className="w-3 h-3" /> Full Screen Alert
                </label>
                <div className="flex items-center gap-2">
                     <input type="number" min="0" max="300" value={config.alertThresholdSeconds} onChange={(e) => handleConfigChange('alertThresholdSeconds', parseInt(e.target.value) || 0)} className="w-20 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Sec" />
                    <span className="text-xs text-slate-500 font-bold">SECONDS BEFORE START</span>
                </div>
               </div>

              {/* Management Controls */}
              <div className="md:col-span-4 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1 w-full max-w-xl mr-auto">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 mb-1">
                        <Type className="w-3 h-3" /> Running Text Alert
                    </label>
                    <div className="flex gap-2">
                        <button onClick={toggleMarqueePause} className={`px-3 rounded border font-bold transition-colors ${config.isMarqueePaused ? 'bg-red-100 text-red-600 border-red-200' : 'bg-green-100 text-green-600 border-green-200'}`} title={config.isMarqueePaused ? "Resume Animation" : "Pause Animation"}>
                            {config.isMarqueePaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                        <input type="text" value={config.runningText} onChange={(e) => handleConfigChange('runningText', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm font-bold text-yellow-800 bg-yellow-50 dark:bg-slate-800 dark:text-yellow-400 focus:ring-2 focus:ring-yellow-400 outline-none shadow-inner" placeholder="Enter alert text here..." />
                    </div>
                </div>
                <div className="flex gap-3">
                     <button onClick={toggleStop} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border transition-colors ${config.isStopped ? 'bg-green-600 text-white border-green-700 hover:bg-green-700' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'}`}>
                        {config.isStopped ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
                        {config.isStopped ? "RESUME SYSTEM" : "STOP SYSTEM"}
                     </button>

                     <button onClick={handleResetSequence} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 border border-slate-700 dark:border-slate-600 transition-colors shadow-sm">
                        <RotateCcw className="w-5 h-5" />
                        RESET SEQUENCE (S)
                     </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 overflow-hidden relative">
        {currentView === 'scheduler' ? (
        <div className="w-full h-full bg-white dark:bg-slate-800 shadow-lg border-t border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          
          <div className="w-full h-full">
            <table className="w-full h-full border-collapse">
              <thead>
                <tr className="h-12">
                  <th className="w-32 bg-slate-800 dark:bg-slate-950 text-white px-2 text-left border-r border-slate-700 dark:border-slate-800">
                    <span className="text-lg font-black font-serif tracking-widest">REACTOR</span>
                  </th>
                  {Array.from({ length: config.columnsToDisplay }).map((_, i) => (
                    <th key={i} className="bg-cyan-500 dark:bg-cyan-700 text-white border-r border-cyan-600 dark:border-cyan-800 px-2 min-w-[220px]">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-sm opacity-80">CYCLE</span>
                        <span className="font-black text-xl">{i + 1}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REACTORS.map((reactor) => (
                  <tr key={reactor.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0 h-1/5">
                    
                    <td className={`${reactor.color} ${reactor.textColor} border-r border-slate-900/10 dark:border-slate-900/30 p-2 relative group`}>
                       <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-7xl font-black font-serif drop-shadow-md">{reactor.label}</span>
                          
                          {/* Reactor Note Display */}
                          <div 
                            className="mt-2 text-center w-full cursor-pointer hover:bg-white/20 rounded px-1 py-1 transition-colors min-h-[20px]"
                            onClick={() => openReactorNoteModal(reactor.id)}
                            title="Click to edit note"
                          >
                             {config.reactorNotes[reactor.id] ? (
                                 <span className="text-sm font-bold uppercase block leading-tight">{config.reactorNotes[reactor.id]}</span>
                             ) : (
                                 <span className="text-xs opacity-50 block flex items-center justify-center gap-1"><Edit3 className="w-3 h-3" /> Note</span>
                             )}
                          </div>
                       </div>
                    </td>

                    {scheduleMatrix[reactor.id].map((item) => {
                      const isSkipped = item.status === 'skipped';
                      const isPast = item.status === 'past';
                      const isActive = item.status === 'active';
                      const mode = item.config?.mode || 'CLOSE';
                      const stageInfo = item.config?.stageInfo;
                      
                      const isAdjusted = item.config?.overrideTime || item.config?.grade || (item.config?.mode && item.config.mode !== 'CLOSE');

                      // Calculate Delay String 00:00
                      const delayHours = Math.floor(Math.abs(item.deltaMinutes) / 60).toString().padStart(2, '0');
                      const delayMins = (Math.abs(item.deltaMinutes) % 60).toString().padStart(2, '0');
                      const delayString = `${delayHours}:${delayMins}`;

                      let cellClasses = "bg-white dark:bg-slate-800 dark:text-slate-100 shadow-sm transition-colors"; 
                      if (isSkipped) cellClasses = "bg-stone-200 dark:bg-stone-950 text-stone-500 dark:text-stone-600 border-stone-300 dark:border-stone-800"; 
                      else if (isActive) cellClasses = "bg-red-500 dark:bg-red-600 text-white animate-pulse ring-inset ring-4 ring-red-300 dark:ring-red-900 z-10 relative"; 
                      else if (isPast) cellClasses = "bg-slate-800 dark:bg-slate-950 text-slate-500 dark:text-slate-600 shadow-inner"; 
                      
                      return (
                        <td 
                            key={item.id} 
                            onClick={() => openRescheduleModal(item)}
                            className={`p-0 border-r border-slate-200 dark:border-slate-700 cursor-pointer transition-all duration-300 relative group hover:z-20 ${cellClasses} hover:ring-4 hover:ring-blue-400`}
                        >
                          <div className="h-full w-full flex flex-col justify-between p-2 md:p-4">
                            
                            {/* Top Row: Batch & Grade - MAXIMIZED */}
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex flex-col">
                                <span className={`text-xs font-bold uppercase tracking-wide ${isActive || isPast || isSkipped ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>Batch</span>
                                {!isSkipped ? (
                                    <span className={`text-4xl font-bold font-mono leading-none ${isActive ? 'text-white' : (reactor.id === 'S' || reactor.id === 'T' ? 'text-red-600 dark:text-red-400' : 'text-red-500 dark:text-red-400')} ${isPast ? '!text-inherit' : ''}`}>
                                        {item.batchNumber}
                                    </span>
                                ) : (
                                    <span className="text-3xl font-bold font-mono text-stone-400 dark:text-stone-600">---</span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`text-2xl font-black px-3 py-1 rounded-lg ${isActive ? 'bg-white text-red-600' : (isSkipped ? 'bg-stone-300 dark:bg-stone-800 text-stone-600 dark:text-stone-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}`}>
                                    {item.grade}
                                </div>
                              </div>
                            </div>

                            {/* Middle: Start Time & Badges - MAXIMIZED */}
                            <div className="text-center py-1 relative flex flex-col items-center justify-center flex-1">
                              {isSkipped ? (
                                <div className="flex flex-col items-center gap-1 opacity-60">
                                    <Ban className="w-16 h-16" />
                                    <span className="text-2xl font-black uppercase tracking-wider">SKIPPED</span>
                                </div>
                              ) : (
                                <>
                                    {/* Unified Time Display - Huge */}
                                    <div className={`text-6xl xl:text-7xl font-black tracking-tighter leading-none ${isActive ? 'text-white scale-110' : (isPast ? 'text-slate-600 dark:text-slate-500 line-through decoration-4 decoration-slate-500' : 'text-slate-800 dark:text-slate-100')} transition-transform`}>
                                        {formatTime(item.startTime)}
                                    </div>
                                    
                                    {/* Status / Badges - Prominent below time */}
                                    {isPast ? (
                                         <div className="flex items-center gap-1 text-lg font-black uppercase text-green-400 dark:text-green-500 mt-2">
                                            <CheckCircle2 className="w-5 h-5" /> SUDAH START
                                         </div>
                                    ) : isActive ? (
                                        <div className="text-2xl font-black text-yellow-300 mt-2 uppercase tracking-widest animate-bounce">
                                            START NOW
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-2 mt-2 flex-wrap w-full">
                                            {/* Adjusted Time Delta Badge HH:MM */}
                                            {item.deltaMinutes !== 0 && (
                                                <div className={`text-sm md:text-base font-black px-2 py-1 rounded uppercase flex items-center gap-1 ${item.deltaMinutes > 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-cyan-100 text-cyan-800'}`}>
                                                    <Timer className="w-4 h-4" /> {item.deltaMinutes > 0 ? '+' : '-'}{delayString}
                                                </div>
                                            )}
                                            {/* Mode Badge - Large */}
                                            <div className={`text-sm md:text-base font-bold px-2 py-1 rounded uppercase border ${mode === 'OPEN' ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}>
                                                {mode} MODE
                                            </div>
                                            {/* Shift Indicator */}
                                            {item.config?.shiftSubsequent && (
                                                <div className="text-sm md:text-base font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded uppercase border border-orange-200 flex items-center gap-1">
                                                    <ArrowRightCircle className="w-4 h-4" /> SHIFT
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                              )}

                              {/* Edit Overlay Icon */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                                  <div className="bg-blue-600 text-white rounded-full p-3 shadow-xl transform scale-125">
                                      <Edit3 className="w-6 h-6" />
                                  </div>
                              </div>
                            </div>

                            {/* Bottom: Notes & Stage Info - Footer */}
                            <div className={`mt-1 flex justify-between items-end border-t pt-1 ${isActive ? 'border-white/30' : 'border-black/5 dark:border-white/10'}`}>
                                <div className="flex gap-1 items-center shrink-0">
                                    {item.config?.note && (
                                        <FileText className={`w-4 h-4 ${isActive ? 'text-yellow-300' : 'text-blue-500 dark:text-blue-400'}`} />
                                    )}
                                    <span className={`text-sm font-bold ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>SM</span>
                                </div>
                                
                                {stageInfo && (
                                    <div className="flex-1 mx-2 overflow-hidden h-5 relative self-center">
                                        <div className={`absolute top-0 left-0 whitespace-nowrap animate-marquee-cell flex items-center h-full ${config.isMarqueePaused ? 'paused' : ''}`}>
                                            {Array(5).fill(null).map((_, idx) => (
                                                <span key={idx} className={`mx-4 text-xs font-black uppercase tracking-wider ${isActive ? 'text-white' : (isPast ? 'text-yellow-400' : 'text-fuchsia-600 dark:text-fuchsia-400')}`}>
                                                    {stageInfo}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <span className={`text-sm md:text-base font-bold shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {formatDate(item.startTime)}
                                </span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : currentView === 'demonomer' ? (
          <Demonomer />
        ) : (
          <Silo />
        )}
        
        <div className="absolute bottom-1 left-0 right-0 text-center text-slate-400 dark:text-slate-500 text-[10px] pointer-events-none">
          AILO CORP | SCHEDULE START PVC 5
        </div>
      </main>

      {/* ... [Reschedule Modal - same as before] ... */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-slate-800 dark:bg-slate-950 text-white p-4 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-blue-400" />
                            Adjust Schedule
                        </h3>
                        <p className="text-xs text-slate-400">
                            Reactor {selectedItem.reactorId} &bull; Batch {selectedItem.batchNumber || '---'}
                        </p>
                    </div>
                    <button onClick={closeRescheduleModal} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto">
                    
                    {/* Stage Info (Sort Info) Selector */}
                    <div className="bg-fuchsia-50 dark:bg-fuchsia-900/20 p-4 rounded-xl border border-fuchsia-100 dark:border-fuchsia-800">
                        <label className="text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300 uppercase mb-2 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Stage Info (Label)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {STAGE_OPTIONS.map(opt => (
                                <button key={opt} onClick={() => setEditForm(prev => ({...prev, stageInfo: opt}))} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${editForm.stageInfo === opt ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-fuchsia-100 dark:hover:bg-slate-600'}`}>
                                    {opt}
                                </button>
                            ))}
                            <button onClick={() => setEditForm(prev => ({...prev, stageInfo: ''}))} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${editForm.stageInfo === '' ? 'bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-600 dark:text-slate-300 dark:border-slate-500' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Mode, Grade & Skip Controls */}
                    <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</label>
                            <button onClick={() => setEditForm(prev => ({ ...prev, isSkipped: !prev.isSkipped }))} className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 font-bold transition-colors ${editForm.isSkipped ? 'bg-stone-200 text-stone-600 border-stone-300' : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-slate-600 hover:border-gray-300'}`}>
                                <Ban className="w-4 h-4" />
                                {editForm.isSkipped ? 'SKIPPED' : 'Active'}
                            </button>
                         </div>
                         <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Mode</label>
                            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
                                <button onClick={() => handleModeChange('CLOSE')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${editForm.mode === 'CLOSE' ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600'}`}>
                                    CLOSE
                                </button>
                                <button onClick={() => handleModeChange('OPEN')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${editForm.mode === 'OPEN' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600'}`}>
                                    OPEN
                                </button>
                            </div>
                         </div>
                    </div>

                    {/* Grade Selector (Override) */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Change Grade (Override)</label>
                        <div className="flex gap-2 flex-wrap">
                            {GRADES.map(g => (
                                <button key={g} onClick={() => setEditForm(prev => ({...prev, grade: g}))} className={`px-3 py-2 text-sm font-bold rounded border ${editForm.grade === g ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600'}`}>
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!editForm.isSkipped && (
                        <>
                            {/* Time Input */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex justify-between">
                                    <span>Start Time</span>
                                    {editForm.mode === 'OPEN' && <span className="text-cyan-600 dark:text-cyan-400 text-xs italic">-30 mins adjusted</span>}
                                </label>
                                <input type="datetime-local" value={editForm.timeValue} onChange={(e) => setEditForm(prev => ({...prev, timeValue: e.target.value}))} className="w-full border-2 border-slate-200 dark:border-slate-600 rounded-lg p-3 text-lg font-mono font-bold text-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition-all bg-white dark:bg-slate-800" />
                                
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Quick Delay Adjustment</label>
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <span className="text-[10px] text-slate-400 font-bold block mb-1">HOURS</span>
                                            <input type="number" min="0" value={editForm.delayHours} onChange={(e) => setEditForm(prev => ({...prev, delayHours: parseInt(e.target.value) || 0}))} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 font-mono text-center" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[10px] text-slate-400 font-bold block mb-1">MINUTES</span>
                                            <input type="number" min="0" value={editForm.delayMinutes} onChange={(e) => setEditForm(prev => ({...prev, delayMinutes: parseInt(e.target.value) || 0}))} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 font-mono text-center" />
                                        </div>
                                        <button onClick={applyManualDelay} className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold px-4 py-2 rounded h-[42px] text-xs transition-colors">
                                            APPLY (+{editForm.manualDelayMinutes}m)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Shift Toggle */}
                            <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/40 cursor-pointer" onClick={() => setEditForm(prev => ({...prev, shiftSubsequent: !prev.shiftSubsequent}))}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editForm.shiftSubsequent ? 'bg-orange-500 border-orange-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                                    {editForm.shiftSubsequent && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                </div>
                                <div className="flex-1">
                                    <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">Stop Running Interval (Shift Schedule)</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-500">Delay will push all subsequent batches forward</span>
                                </div>
                                <PauseCircle className="w-5 h-5 text-orange-400" />
                            </div>
                        </>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Operator Notes</label>
                        <textarea value={editForm.note} onChange={(e) => setEditForm(prev => ({...prev, note: e.target.value}))} placeholder="Add information for DCS operator..." className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]" />
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end shrink-0">
                    {config.itemConfigs[selectedItem.id] && (
                        <button onClick={clearOverride} className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-bold text-sm transition-colors mr-auto">
                            Reset
                        </button>
                    )}
                    <button onClick={closeRescheduleModal} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-sm">
                        Cancel
                    </button>
                    <button onClick={saveReschedule} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- Edit Reactor Note Modal --- */}
      {editingReactorNote && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Edit Note for Reactor {editingReactorNote}</h3>
                  <input
                    type="text"
                    value={tempReactorNote}
                    onChange={(e) => setTempReactorNote(e.target.value)}
                    placeholder="Enter short note (e.g. USE LANCE 2)..."
                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingReactorNote(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                          Cancel
                      </button>
                      <button onClick={saveReactorNote} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
                          Save
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;