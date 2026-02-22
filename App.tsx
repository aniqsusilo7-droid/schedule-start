
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { REACTORS } from './constants';
import { AppState, ScheduleItem, ItemConfig, GradeType, SiloState, SiloData, DemonomerData } from './types';
import { addMinutes, formatDate, formatTime } from './utils/dateUtils';
import { Clock } from './components/Clock';
import { Demonomer } from './components/Demonomer';
import { Silo } from './components/Silo';
import { Settings, RefreshCw, AlertTriangle, Calendar, Hash, Volume2, VolumeX, Edit3, X, PlayCircle, Clock as ClockIcon, FileText, Ban, FastForward, PauseCircle, ArrowRightCircle, CheckCircle2, Wrench, RotateCcw, Power, Bell, Timer, ChevronDown, Info, Tag, ArrowRight, LayoutGrid, Activity, Database, Type, Sun, Moon, Pause, Play, Save, Gauge, Move, ArrowUp, ArrowDown, Palette, ZoomIn, ZoomOut, Monitor, Maximize2, Check } from 'lucide-react';
import { supabase } from './supabaseClient';

const GRADES: GradeType[] = ['SM', 'SLK', 'SLP', 'SE', 'SR'];
const STAGE_OPTIONS = ['Sample Blowing', 'Sample Washing', 'Sample Air Slurry'];

// Web Audio API Sound Effect (Rocket/Firecracker)
const playRocketSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const t = ctx.currentTime;

        // 1. Rocket Whistle (Rising Pitch)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(1000, t + 0.5);
        
        oscGain.gain.setValueAtTime(0.1, t);
        oscGain.gain.linearRampToValueAtTime(0.1, t + 0.4);
        oscGain.gain.linearRampToValueAtTime(0, t + 0.5);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);

        // 2. Explosion (Noise Burst) at t + 0.5
        const bufferSize = ctx.sampleRate * 1.5; // 1.5 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1000, t + 0.5);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 1.5);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(1, t + 0.5);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        
        noise.start(t + 0.5);
        noise.stop(t + 2.0);

    } catch (e) {
        console.error("Web Audio API Error:", e);
    }
};

// Available Sections for Layout
const SECTIONS = {
    header: 'Header & Controls',
    scheduler: 'Main Schedule Table',
    catalyst: 'Catalyst Input Section'
};

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

  // State for Silo Modal
  const [isSiloModalOpen, setIsSiloModalOpen] = useState(false);
  
  // State for Silo START Confirmation Modal
  const [startSiloData, setStartSiloData] = useState<{
      id: 'O' | 'P' | 'Q';
      lotNumber: string;
      capacitySet: string;
      startTime: string;
  } | null>(null);
  
  // Design Mode State
  const [isDesignMode, setIsDesignMode] = useState(false);

  // Zoom State (Supabase Persistence)
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Catalyst State (Supabase Persistence)
  const [catalystData, setCatalystData] = useState({
    f: { netto: '24,9', bruto: '' },
    h: { netto: '10,8', bruto: '' },
    g: { netto: '', bruto: '' }
  });

  // Demonomer State (Supabase Persistence)
  const [demonomerData, setDemonomerData] = useState<DemonomerData>({
      f2002: 125,
      aie2802: 1070,
      pvcPercent: 25,
      multipliers: { SM: 118, SLP: 108, SLK: 128, SE: 140, SR: 100 },
      pvcFormula: "F2002*AI2802/1000*%PVC",
      steamFormula: "PVC * Multiplier"
  });

  // --- Silo State ---
  const [siloState, setSiloState] = useState<SiloState>({
      activeSilo: null, // No active silo initially
      silos: {
          O: { id: 'O', lotNumber: '', capacitySet: '', startTime: '', finishTime: '', percentage: '', totalUpdate: '' },
          P: { id: 'P', lotNumber: '', capacitySet: '', startTime: '', finishTime: '', percentage: '', totalUpdate: '' },
          Q: { id: 'Q', lotNumber: '', capacitySet: '', startTime: '', finishTime: '', percentage: '', totalUpdate: '' }
      }
  });
  
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
    marqueeSpeed: 30, // Default 30s
    theme: 'light',
    layoutOrder: ['header', 'scheduler', 'catalyst'], // Updated: Header first to match request "move to top"
    tableRowHeight: 95, 
    tableFontSize: 24 
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Default closed to look cleaner on load
  const announcedBatches = useRef<Set<string>>(new Set());
  const [audioAllowed, setAudioAllowed] = useState(false); // Track if audio is allowed

  // Temp State for Settings Inputs
  const [tempBaseBatchNumber, setTempBaseBatchNumber] = useState(config.baseBatchNumber);
  const [tempBaseStartTime, setTempBaseStartTime] = useState(config.baseStartTime);

  // Sync temp state with config when config loads/changes
  useEffect(() => {
    setTempBaseBatchNumber(config.baseBatchNumber);
    setTempBaseStartTime(config.baseStartTime);
  }, [config.baseBatchNumber, config.baseStartTime]);

  // --- Effects ---
  
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

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

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
                marqueeSpeed: settingsData.marquee_speed || 30,
                theme: (settingsData.theme as 'light' | 'dark') || 'light',
                reactorNotes: notesMap,
                itemConfigs: itemConfigsMap,
                layoutOrder: settingsData.layout_order || ['header', 'scheduler', 'catalyst'], // Fallback
                tableRowHeight: settingsData.table_row_height || 95,
                tableFontSize: settingsData.table_font_size || 24,
            });

            // Load Zoom Level
            if (settingsData.zoom_level) {
                setZoomLevel(settingsData.zoom_level);
            }

            // Load Catalyst Data
            if (settingsData.catalyst_data) {
                setCatalystData(settingsData.catalyst_data);
            }

            // Load Silo State
            if (settingsData.silo_state) {
                setSiloState(settingsData.silo_state);
            }

            // Load Demonomer Data
            if (settingsData.demonomer_data) {
                setDemonomerData(settingsData.demonomer_data);
            }

        } else {
             // Init defaults if no settings exist
             await supabase.from('app_settings').insert([{ id: 1 }]);
        }
      } catch (error) {
        console.error("Error loading data from Supabase:", error);
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
        marqueeSpeed: 'marquee_speed',
        theme: 'theme',
        layoutOrder: 'layout_order',
        tableRowHeight: 'table_row_height',
        tableFontSize: 'table_font_size'
    };

    if (dbMap[key]) {
        updateGlobalSetting({ [dbMap[key]!]: value });
    }
  };

  // Zoom Handlers
  const handleZoomIn = () => {
      const newZoom = Math.min(zoomLevel + 0.1, 2.0);
      setZoomLevel(newZoom);
      updateGlobalSetting({ zoom_level: newZoom });
  };
  const handleZoomOut = () => {
      const newZoom = Math.max(zoomLevel - 0.1, 0.5);
      setZoomLevel(newZoom);
      updateGlobalSetting({ zoom_level: newZoom });
  };
  const handleZoomReset = () => {
      setZoomLevel(1);
      updateGlobalSetting({ zoom_level: 1 });
  };

  // --- Layout Reordering Handlers ---
  const moveSection = (index: number, direction: 'up' | 'down') => {
      const newOrder = [...config.layoutOrder];
      if (direction === 'up') {
          if (index === 0) return;
          [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      } else {
          if (index === newOrder.length - 1) return;
          [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
      }
      handleConfigChange('layoutOrder', newOrder);
  };

  // Update "now" every second
  useEffect(() => {
    if (config.isStopped) return; 

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [config.isStopped]);

  const handleApply = () => {
    handleConfigChange('baseBatchNumber', tempBaseBatchNumber);
    handleConfigChange('baseStartTime', tempBaseStartTime);
    alert("Settings Applied!");
  };

  const toggleAudio = () => {
    handleConfigChange('audioEnabled', !config.audioEnabled);
  };
  
  const toggleStop = () => {
    handleConfigChange('isStopped', !config.isStopped);
  };

  // State for Reset Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetParams, setResetParams] = useState({ batch: 0, time: '' });

  const toggleTheme = () => {
      handleConfigChange('theme', config.theme === 'light' ? 'dark' : 'light');
  };

  const toggleMarqueePause = () => {
      handleConfigChange('isMarqueePaused', !config.isMarqueePaused);
  };

  const handleResetSequence = () => {
      const n = new Date();
      const coeff = 1000 * 60 * 5;
      const rounded = new Date(Math.round(n.getTime() / coeff) * coeff);
      // Local ISO string for input
      const localIso = new Date(rounded.getTime() - (rounded.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      
      setResetParams({
          batch: config.baseBatchNumber,
          time: localIso
      });
      setIsResetModalOpen(true);
  };

  const submitResetSequence = async () => {
      try {
          const newStartTime = new Date(resetParams.time).toISOString();
          
          // Update Supabase
          await supabase.from('app_settings').update({
              base_batch_number: resetParams.batch,
              base_start_time: newStartTime,
          }).eq('id', 1);

          // Clear overrides to ensure a fresh cycle
          await supabase.from('schedule_overrides').delete().neq('id', 'placeholder');

          // Update Local State
          setConfig(prev => ({
              ...prev,
              baseBatchNumber: resetParams.batch,
              baseStartTime: newStartTime,
              itemConfigs: {} // Clear overrides
          }));
          
          setDismissedAlerts(new Set());
          setIsResetModalOpen(false);
      } catch (error) {
          console.error("Error resetting sequence:", error);
          alert("Failed to reset sequence. Check console.");
      }
  };

  // --- Catalyst Handlers ---
  const handleCatalystChange = (row: 'f' | 'h' | 'g', field: 'netto' | 'bruto', val: string) => {
    const newData = {
      ...catalystData,
      [row]: { ...catalystData[row], [field]: val }
    };
    setCatalystData(newData);
    updateGlobalSetting({ catalyst_data: newData });
  };

  // --- Silo Handlers ---
  
  // 1. Initial Click Handler: Opens the Confirmation Modal
  const handleSiloSwitch = (newSiloId: 'O' | 'P' | 'Q') => {
      if (newSiloId === siloState.activeSilo) return;

      const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      // Initialize the modal with default values
      setStartSiloData({
          id: newSiloId,
          lotNumber: '', // Empty initially
          capacitySet: '', // Empty initially
          startTime: currentTime
      });
  };

  // 2. Commit Handler: Executed when user confirms inside the Modal
  const handleConfirmSiloStart = () => {
      if (!startSiloData) return;

      const previousSiloId = siloState.activeSilo;
      const { id: newSiloId, lotNumber, capacitySet, startTime } = startSiloData;

      // Logic to switch silos
      const updatedSilos = { ...siloState.silos };
      
      // Update new silo with form data
      updatedSilos[newSiloId] = {
          ...updatedSilos[newSiloId],
          lotNumber: lotNumber,
          capacitySet: capacitySet,
          startTime: startTime,
          finishTime: null, // Clear finish time for new active
          percentage: '', // Reset progress for new batch
          totalUpdate: '' // Reset update for new batch
      };

      // Update previous silo with finish time if exists (matches new start time)
      if (previousSiloId) {
          updatedSilos[previousSiloId] = {
              ...updatedSilos[previousSiloId],
              finishTime: startTime
          };
      }

      const newSiloState = {
          activeSilo: newSiloId,
          silos: updatedSilos
      };

      setSiloState(newSiloState);
      updateGlobalSetting({ silo_state: newSiloState });

      // Close Modal
      setStartSiloData(null);
  };

  const handleSiloDataChange = (siloId: 'O' | 'P' | 'Q', field: keyof SiloData, value: any) => {
      const newSiloState = {
          ...siloState,
          silos: {
              ...siloState.silos,
              [siloId]: {
                  ...siloState.silos[siloId],
                  [field]: value
              }
          }
      };
      setSiloState(newSiloState);
      updateGlobalSetting({ silo_state: newSiloState });
  };

  // --- Demonomer Handlers ---
  const handleDemonomerChange = (field: keyof DemonomerData, value: any) => {
      const newData = { ...demonomerData, [field]: value };
      setDemonomerData(newData);
      updateGlobalSetting({ demonomer_data: newData });
  };

  // --- Reactor Note Handlers ---
  const openReactorNoteModal = (reactorId: string) => {
      setEditingReactorNote(reactorId);
      setTempReactorNote(config.reactorNotes[reactorId] || "");
  };
  
  const saveReactorNote = async () => {
      if (editingReactorNote) {
          setConfig(prev => ({
              ...prev,
              reactorNotes: {
                  ...prev.reactorNotes,
                  [editingReactorNote]: tempReactorNote
              }
          }));

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

  // Audio Logic
   useEffect(() => {
    if (!config.audioEnabled || config.isStopped) return;

    Object.values(scheduleMatrix).flat().forEach(item => {
        if (item.status === 'active' && !announcedBatches.current.has(item.id)) {
            playRocketSound();
            announcedBatches.current.add(item.id);
            
            // Check if audio context is allowed (simple check)
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                if (ctx.state === 'suspended') {
                    setAudioAllowed(false);
                } else {
                    setAudioAllowed(true);
                }
                ctx.close();
            }
        }
    });

    if (announcedBatches.current.size > 50) {
        announcedBatches.current.clear();
    }
  }, [scheduleMatrix, config.audioEnabled, config.isStopped]);

  // Handler to enable audio manually
  const enableAudio = () => {
      playRocketSound();
      setAudioAllowed(true);
  };


  // Full Screen Alert Logic
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
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
              <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <div className="text-slate-500 font-bold animate-pulse">Connecting to Supabase...</div>
          </div>
      );
  }

  // --- Render Components Logic ---
  
  const renderHeader = () => (
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 shadow-sm z-30 relative transition-colors duration-300">
        
        {/* Main Header Container */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 max-w-[1920px] mx-auto">
          
          {/* Left Section: Widget & Nav */}
          <div className="flex items-center gap-4">
              
              {/* Widget: Interval & Time */}
              <div className="flex bg-slate-800 rounded-lg p-1 shadow-md shrink-0">
                     {/* Interval */}
                     <div className="px-4 py-1 flex flex-col items-center justify-center border-r border-slate-700/50 min-w-[120px]">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-0.5">INTERVAL</span>
                        <div className="text-4xl font-mono font-black text-cyan-300 leading-none">
                            {config.intervalHours.toString().padStart(2, '0')}:{config.intervalMinutes.toString().padStart(2, '0')}
                        </div>
                     </div>
                     {/* Time */}
                     <div className="px-4 py-1 flex flex-col items-center justify-center min-w-[180px]">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">CURRENT TIME</span>
                        <div className="bg-white w-full mx-2 text-slate-900 px-2 py-0.5 rounded shadow-sm font-mono font-black text-3xl tracking-widest leading-none flex items-center justify-center">
                            {now.toLocaleTimeString('en-GB', { hour12: false })}
                            <span className="text-[10px] ml-1 text-slate-500 font-bold self-end mb-0.5">s</span>
                        </div>
                     </div>
              </div>

              {/* Navigation Pill */}
              <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setCurrentView('scheduler')} className={`px-4 py-2 text-xs font-black uppercase rounded transition-all flex items-center gap-2 ${currentView === 'scheduler' ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                        <LayoutGrid className="w-4 h-4" /> <span className="hidden xl:inline">SCHEDULER</span>
                    </button>
                    <button onClick={() => setCurrentView('demonomer')} className={`px-4 py-2 text-xs font-black uppercase rounded transition-all flex items-center gap-2 ${currentView === 'demonomer' ? 'bg-white dark:bg-slate-600 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                        <Activity className="w-4 h-4" /> <span className="hidden xl:inline">DEMONOMER</span>
                    </button>
                     <button onClick={() => setCurrentView('silo')} className={`px-4 py-2 text-xs font-black uppercase rounded transition-all flex items-center gap-2 ${currentView === 'silo' ? 'bg-white dark:bg-slate-600 text-cyan-700 dark:text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                        <Database className="w-4 h-4" /> <span className="hidden xl:inline">SILO</span>
                    </button>
              </div>
          </div>

          {/* Center Section: Title */}
          <div className="flex flex-col items-center justify-center shrink-0 mx-8 p-2 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase flex items-center gap-2 drop-shadow-sm">
               <span className="text-blue-600 dark:text-blue-400">SCHEDULE</span> 
               <span className="text-slate-800 dark:text-slate-200">START</span>
            </h1>
            <span className="text-xl font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] block w-full text-center uppercase mt-1 border-t-2 border-slate-200 dark:border-slate-700 pt-1">
                REAKTOR PVC 5
            </span>
          </div>

          {/* Right Section: Grades & Controls */}
          <div className="flex items-center gap-4 ml-auto">
              
              {/* Grade Selector */}
              {currentView === 'scheduler' && (
                  <div className="flex gap-1">
                      {GRADES.map(g => (
                          <button key={g} onClick={() => handleConfigChange('currentGrade', g)} className={`px-3 py-1.5 text-sm font-black rounded border transition-all ${config.currentGrade === g ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600'}`}>
                              {g}
                          </button>
                      ))}
                  </div>
              )}

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

              {/* Controls Group */}
              <div className="flex items-center gap-2">
                    {/* Zoom */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm">
                        <button onClick={handleZoomOut} className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors hover:bg-white dark:hover:bg-slate-700 rounded">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-bold w-10 text-center text-slate-600 dark:text-slate-300 cursor-pointer select-none" onClick={handleZoomReset} title="Reset Zoom">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button onClick={handleZoomIn} className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors hover:bg-white dark:hover:bg-slate-700 rounded">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>

                    <button onClick={toggleAudio} className={`p-2 rounded-md border transition-all shadow-sm ${config.audioEnabled ? 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 hover:text-slate-600'}`} title="Toggle Voice">
                        {config.audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>

                    <button onClick={toggleTheme} className={`p-2 rounded-md border transition-all shadow-sm ${config.theme === 'dark' ? 'bg-slate-800 text-yellow-400 border-slate-700 hover:bg-slate-700' : 'bg-yellow-50 text-orange-500 border-orange-200 hover:bg-yellow-100'}`} title="Toggle Theme">
                        {config.theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>

                    <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-2 rounded-md border transition-all shadow-sm ${isSettingsOpen ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 hover:text-slate-600'}`} title="Settings">
                        <Settings className="w-5 h-5" />
                    </button>
              </div>

          </div>
        </div>

        {/* Settings Panel Drawer */}
            {isSettingsOpen && (
              <div className="border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200 transition-colors bg-slate-50 dark:bg-slate-900/50 py-4 mt-3">
                <div className="w-full px-4 mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  {/* DESIGN MODE TOGGLE */}
                  <div className="md:col-span-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                          <Palette className="w-5 h-5" />
                          <span className="font-bold">Layout Design Mode</span>
                      </div>
                      <button 
                        onClick={() => setIsDesignMode(!isDesignMode)}
                        className={`px-4 py-1.5 rounded-full font-bold text-xs transition-colors ${isDesignMode ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                      >
                          {isDesignMode ? 'ACTIVE - EDIT LAYOUT' : 'DISABLED'}
                      </button>
                  </div>

                  {isDesignMode && (
                      <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Table Row Height ({config.tableRowHeight}px)</label>
                              <input 
                                type="range" 
                                min="60" 
                                max="200" 
                                value={config.tableRowHeight} 
                                onChange={(e) => handleConfigChange('tableRowHeight', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Table Font Size ({config.tableFontSize}px)</label>
                              <input 
                                type="range" 
                                min="10" 
                                max="24" 
                                value={config.tableFontSize} 
                                onChange={(e) => handleConfigChange('tableFontSize', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600"
                              />
                          </div>
                      </div>
                  )}

                  {/* NEXT PREDICTION START INFO */}
                  <div className="md:col-span-4 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-full">
                              <FastForward className="w-6 h-6" />
                          </div>
                          <div>
                              <h3 className="font-black text-lg uppercase">Next Cycle Prediction</h3>
                              <p className="text-xs font-bold opacity-70">Auto-start parameters after current sequence</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-6">
                          <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Next Batch</span>
                              <span className="text-2xl font-mono font-black text-emerald-700 dark:text-emerald-200">#{nextStartParams.batch}</span>
                          </div>
                          <div className="h-8 w-px bg-emerald-200 dark:bg-emerald-700"></div>
                          <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Est. Start Time</span>
                              <span className="text-2xl font-mono font-black text-emerald-700 dark:text-emerald-200">
                                  {new Date(nextStartParams.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  <span className="text-xs ml-1 align-top opacity-60">{new Date(nextStartParams.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* Standard Settings Below */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Start Batch #
                    </label>
                    <input 
                      type="number" 
                      value={tempBaseBatchNumber}
                      onChange={(e) => setTempBaseBatchNumber(parseInt(e.target.value) || 0)}
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
                        value={tempBaseStartTime.slice(0, 16)}
                        onChange={(e) => setTempBaseStartTime(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button onClick={handleApply} className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 transition-colors font-bold text-xs" title="Apply Settings">
                        APPLY
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
                    <div className="flex-1 w-full max-w-xl mr-auto space-y-3">
                        {/* Marquee Text Control */}
                        <div>
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

                        {/* Marquee Speed Control */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 mb-1">
                                <Gauge className="w-3 h-3" /> Running Text Speed ({config.marqueeSpeed}s)
                            </label>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">FAST</span>
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="180" 
                                    step="1"
                                    value={config.marqueeSpeed} 
                                    onChange={(e) => handleConfigChange('marqueeSpeed', parseInt(e.target.value))} 
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600"
                                />
                                <span className="text-[10px] font-bold text-slate-400">SLOW</span>
                            </div>
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
  );

  const renderScheduler = () => {
    if (currentView !== 'scheduler') return null;

    // Helper to format delay minutes into HH:MM (e.g., +01:30)
    const formatDelay = (minutes: number) => {
        const absMinutes = Math.abs(minutes);
        const h = Math.floor(absMinutes / 60);
        const m = absMinutes % 60;
        const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        return `${minutes > 0 ? '+' : '-'}${formatted}`;
    };

    return (
        <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors" style={{ fontSize: `${config.tableFontSize}px` }}>
          
           {/* MARQUEE BAR: Placed between header and table rows */}
           <div className="w-full bg-blue-100 dark:bg-blue-900/50 border-b border-blue-200 dark:border-blue-800 overflow-hidden h-8 relative flex items-center">
                <div className="absolute inset-0 flex items-center w-full">
                     <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-blue-100 dark:from-slate-900/50 to-transparent pointer-events-none"></div>
                     <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-blue-100 dark:from-slate-900/50 to-transparent pointer-events-none"></div>
                     
                     <div className="flex whitespace-nowrap w-full">
                          <div 
                              className={`flex shrink-0 animate-marquee items-center min-w-full ${config.isMarqueePaused ? 'paused' : ''}`}
                              style={{ animationDuration: `${config.marqueeSpeed}s` }}
                          >
                              {Array(5).fill(null).map((_, i) => (
                                  <span key={i} className="flex items-center gap-2 mx-8 font-black text-blue-800 dark:text-blue-100 uppercase tracking-wider text-[0.875em]">
                                      <AlertTriangle className="w-[1.25em] h-[1.25em]" />
                                      {config.runningText}
                                  </span>
                              ))}
                          </div>
                          <div 
                              className={`flex shrink-0 animate-marquee items-center min-w-full ${config.isMarqueePaused ? 'paused' : ''}`} 
                              style={{ animationDuration: `${config.marqueeSpeed}s` }}
                              aria-hidden="true"
                          >
                              {Array(5).fill(null).map((_, i) => (
                                  <span key={i + 10} className="flex items-center gap-2 mx-8 font-black text-blue-800 dark:text-blue-100 uppercase tracking-wider text-[0.875em]">
                                      <AlertTriangle className="w-[1.25em] h-[1.25em]" />
                                      {config.runningText}
                                  </span>
                              ))}
                          </div>
                      </div>
                </div>
           </div>

          <div className="overflow-x-auto h-full">
            <table className="w-full border-collapse h-full">
              {/* Removed <thead> to align with image where the first row is just data rows */}
              <tbody>
                {REACTORS.map((reactor) => (
                  <tr key={reactor.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0" style={{ height: `${config.tableRowHeight}px` }}>
                    
                    <td className={`${reactor.color} ${reactor.textColor} border-r border-slate-900/10 dark:border-slate-900/30 p-2 relative group w-[140px]`}>
                       <div className="flex flex-col items-center justify-center h-full">
                          <span className="font-black font-serif drop-shadow-md leading-none" style={{ fontSize: '3.5em' }}>{reactor.label}</span>
                          
                          {/* Reactor Note Display */}
                          <div 
                            className="mt-2 w-full cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => openReactorNoteModal(reactor.id)}
                            title="Click to edit note"
                          >
                             {config.reactorNotes[reactor.id] ? (
                                 <div className="bg-yellow-400 text-black font-black text-center rounded px-1 uppercase tracking-tighter border-2 border-red-600 shadow-sm overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: '0.85em' }}>
                                     {config.reactorNotes[reactor.id]}
                                 </div>
                             ) : (
                                 <div className="opacity-50 flex items-center justify-center scale-75"><Edit3 className="w-4 h-4" /></div>
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
                      
                      let cellClasses = "bg-white dark:bg-slate-800 dark:text-slate-100 shadow-sm transition-colors"; 
                      if (isSkipped) cellClasses = "bg-stone-200 dark:bg-stone-950 text-stone-500 dark:text-stone-600 border-stone-300 dark:border-stone-800"; 
                      else if (isActive) cellClasses = "bg-red-500 dark:bg-red-600 text-white animate-pulse ring-4 ring-red-300 dark:ring-red-900 z-10 relative"; 
                      else if (isPast) cellClasses = "bg-slate-800 dark:bg-slate-950 text-slate-500 dark:text-slate-600 shadow-inner"; 
                      
                      return (
                        <td 
                            key={item.id} 
                            onClick={() => openRescheduleModal(item)}
                            className={`p-0 border-r border-slate-200 dark:border-slate-700 cursor-pointer transition-all duration-300 relative group hover:z-20 ${cellClasses} hover:ring-2 hover:ring-blue-400`}
                        >
                          <div className="h-full flex flex-col justify-between p-2">
                            
                            {/* Top Row: Batch & Grade */}
                            <div className="flex justify-between items-start mb-0.5">
                              <div className="flex flex-col leading-none">
                                {!isSkipped ? (
                                    <span className={`font-bold font-mono ${isActive ? 'text-white' : (reactor.id === 'S' || reactor.id === 'T' ? 'text-red-600 dark:text-red-400' : 'text-red-500 dark:text-red-400')} ${isPast ? '!text-inherit' : ''}`} style={{ fontSize: '1.4em' }}>
                                        <span className="opacity-50 text-[0.6em] mr-0.5">#</span>{item.batchNumber}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold font-mono text-stone-400 dark:text-stone-600">---</span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`font-black px-1.5 py-0.5 rounded leading-none ${isActive ? 'bg-white text-red-600' : (isSkipped ? 'bg-stone-300 dark:bg-stone-800 text-stone-600 dark:text-stone-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}`} style={{ fontSize: '1.1em' }}>
                                    {item.grade}
                                </div>
                              </div>
                            </div>

                            {/* Middle: Start Time & Badges */}
                            <div className="text-center relative flex flex-col items-center justify-center flex-1 my-1">
                              {isSkipped ? (
                                <div className="flex flex-col items-center opacity-60 gap-1">
                                    <Ban className="w-[1.5em] h-[1.5em]" />
                                    <span className="text-[0.6em] font-bold">SKIPPED</span>
                                </div>
                              ) : (
                                <>
                                    {/* Unified Time Display - Significantly Larger */}
                                    <div className={`font-black tracking-tighter leading-none ${isActive ? 'text-white scale-110' : (isPast ? 'text-slate-600 dark:text-slate-500 line-through decoration-4 decoration-slate-500' : 'text-slate-800 dark:text-slate-100')} transition-transform`} style={{ fontSize: '3.5em' }}>
                                        {formatTime(item.startTime)}
                                    </div>
                                    
                                    {/* Status / Badges */}
                                    {isPast ? (
                                        <div className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1 opacity-75" style={{ fontSize: '0.8em' }}>
                                            SUDAH START
                                        </div>
                                    ) : isActive ? (
                                        <div className="font-black text-yellow-300 uppercase tracking-widest animate-bounce mt-1" style={{ fontSize: '0.9em' }}>
                                            START NOW
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-1 mt-1 flex-wrap w-full items-center">
                                            {/* Adjusted Time Delta Badge (HH:MM) */}
                                            {item.deltaMinutes !== 0 && (
                                                <div className={`font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 ${item.deltaMinutes > 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-cyan-100 text-cyan-800'}`} style={{ fontSize: '0.85em' }}>
                                                    <Timer className="w-[1em] h-[1em]" /> {formatDelay(item.deltaMinutes)}
                                                </div>
                                            )}
                                            {/* Mode Badge - Visible for Open/Close Status */}
                                            <div className={`font-bold px-1.5 py-0.5 rounded uppercase border flex items-center gap-1 ${mode === 'OPEN' ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`} style={{ fontSize: '0.85em' }}>
                                                <span className="text-[0.7em] opacity-70 mr-0.5">MODE</span>
                                                {mode}
                                            </div>
                                            {/* Shift Indicator */}
                                            {item.config?.shiftSubsequent && (
                                                <div className="font-bold bg-orange-100 text-orange-700 px-1 py-0.5 rounded uppercase border border-orange-200 flex items-center" style={{ fontSize: '0.85em' }}>
                                                    <ArrowRightCircle className="w-[1em] h-[1em]" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                              )}

                              {/* Edit Overlay Icon */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                                  <div className="bg-blue-600 text-white rounded-full p-2 shadow-lg">
                                      <Edit3 className="w-6 h-6" />
                                  </div>
                              </div>
                            </div>

                            {/* Bottom: Notes & Stage Info */}
                            <div className={`mt-auto flex justify-between items-end border-t pt-1 ${isActive ? 'border-white/30' : 'border-black/5 dark:border-white/10'}`}>
                                <div className="flex gap-1 items-center shrink-0">
                                    {item.config?.note && (
                                        <FileText className={`w-4 h-4 ${isActive ? 'text-yellow-300' : 'text-blue-500 dark:text-blue-400'}`} />
                                    )}
                                </div>
                                
                                {stageInfo && (
                                    <div className="flex-1 mx-1 self-center bg-yellow-400 text-black font-black text-center animate-pulse rounded px-1 uppercase tracking-tighter border-2 border-red-600 shadow-sm overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: '0.85em' }}>
                                        {stageInfo}
                                    </div>
                                )}

                                <span className={`font-bold shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} style={{ fontSize: '0.9em' }}>
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
    );
  };

  const renderCatalyst = () => {
      if (currentView !== 'scheduler') return null;

      const colWidth1 = "w-[8em]";
      const colWidth2 = "w-[6em]";
      const colWidth3 = "w-[6em]";

      const activeSiloData = siloState.activeSilo ? siloState.silos[siloState.activeSilo] : null;

      return (
           <div className="flex flex-col md:flex-row gap-8 items-start mt-4" style={{ fontSize: `${config.tableFontSize}px` }}>
               
               {/* 1. CATALYST TABLE */}
               <div className="border-[3px] border-black w-fit flex flex-col bg-white dark:bg-slate-800 shadow-md">
                    {/* Headers */}
                    <div className="flex text-center font-bold text-black border-b-[2px] border-black">
                         <div className={`${colWidth1} bg-[#00B050] border-r border-black py-2 flex items-center justify-center`}>
                            <span className="text-[0.9em]">CATALYST</span>
                         </div>
                         <div className={`${colWidth2} bg-[#00B050] border-r border-black py-2 flex items-center justify-center`}>
                            <span className="text-[0.9em]">NETO</span>
                         </div>
                         <div className={`${colWidth3} bg-[#00B050] py-2 flex items-center justify-center`}>
                            <span className="text-[0.9em]">BRUTO</span>
                         </div>
                    </div>

                    {/* Row F */}
                    <div className="flex h-[2.5em] border-b border-black last:border-0">
                        <div className={`${colWidth1} bg-black text-white font-black flex items-center justify-center border-r border-black`}>
                            <span className="text-[1.25em]">F</span>
                        </div>
                        <div className={`${colWidth2} bg-white border-r border-black p-[1px]`}>
                            <input 
                                type="text" 
                                value={catalystData.f.netto} 
                                onChange={(e) => handleCatalystChange('f', 'netto', e.target.value)}
                                className="w-full h-full bg-transparent text-black text-center font-bold text-[1.125em] outline-none"
                            />
                        </div>
                        <div className={`${colWidth3} bg-white p-[1px]`}>
                            <input 
                                type="text" 
                                value={catalystData.f.bruto} 
                                onChange={(e) => handleCatalystChange('f', 'bruto', e.target.value)}
                                className="w-full h-full bg-transparent text-black text-center font-bold text-[1.125em] outline-none"
                            />
                        </div>
                    </div>

                     {/* Row H */}
                     <div className="flex h-[2.5em] border-b border-black last:border-0">
                        <div className={`${colWidth1} bg-[#FFFF00] text-black font-black flex items-center justify-center border-r border-black`}>
                            <span className="text-[1.25em]">H</span>
                        </div>
                        <div className={`${colWidth2} bg-white border-r border-black p-[1px]`}>
                            <input 
                                type="text" 
                                value={catalystData.h.netto} 
                                onChange={(e) => handleCatalystChange('h', 'netto', e.target.value)}
                                className="w-full h-full bg-transparent text-black text-center font-bold text-[1.125em] outline-none"
                            />
                        </div>
                        <div className={`${colWidth3} bg-white p-[1px]`}>
                            <input 
                                type="text" 
                                value={catalystData.h.bruto} 
                                onChange={(e) => handleCatalystChange('h', 'bruto', e.target.value)}
                                className="w-full h-full bg-transparent text-black text-center font-bold text-[1.125em] outline-none"
                            />
                        </div>
                    </div>

                    {/* Row G */}
                    <div className="flex h-[2.5em] border-b border-black last:border-0">
                        <div className={`${colWidth1} bg-[#7030A0] text-white font-black flex items-center justify-center border-r border-black`}>
                            <span className="text-[1.25em]">G</span>
                        </div>
                        <div className={`${colWidth2} bg-white border-r border-black p-[1px]`}>
                            <input 
                                type="text" 
                                value={catalystData.g.netto} 
                                onChange={(e) => handleCatalystChange('g', 'netto', e.target.value)}
                                className="w-full h-full bg-transparent text-black text-center font-bold text-[1.125em] outline-none"
                            />
                        </div>
                        <div className={`${colWidth3} bg-white p-[1px]`}>
                            <input 
                                type="text" 
                                value={catalystData.g.bruto} 
                                onChange={(e) => handleCatalystChange('g', 'bruto', e.target.value)}
                                className="w-full h-full bg-transparent text-black text-center font-bold text-[1.125em] outline-none"
                            />
                        </div>
                    </div>
               </div>

               {/* 2. SILO SETTING WIDGET */}
               <div className="flex flex-col w-fit">
                    {/* Header Button to Open Modal */}
                    <button 
                        onClick={() => setIsSiloModalOpen(true)}
                        className="bg-[#FFC000] hover:bg-[#E5AC00] text-black font-bold text-[1em] px-4 py-3 text-center border-t-2 border-l-2 border-r-2 border-white/0 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                        <Maximize2 className="w-4 h-4" />
                        CHANGE SILO TO SETTING (ADJUST)
                    </button>

                    {/* Big Display for Active Silo */}
                    <div className="flex">
                        <div className="bg-[#00B0F0] text-black font-black p-4 flex items-center justify-center w-[16em] border-4 border-[#0090C0] shadow-inner relative overflow-hidden group">
                             {/* Background Effect */}
                             <div className="absolute inset-0 bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                             {/* Silo Letter */}
                             <span className="text-7xl mr-6 drop-shadow-md">{siloState.activeSilo || '-'}</span>
                             
                             {/* Details */}
                             <div className="flex flex-col leading-tight text-left border-l-2 border-black/20 pl-4">
                                 <div className="mb-2">
                                     <span className="text-[0.6em] opacity-70 block font-bold">START TIME</span>
                                     <span className="text-[1.5em] block bg-white/20 px-1 rounded">{activeSiloData?.startTime || '--:--'}</span>
                                 </div>
                                 <div>
                                     <span className="text-[0.6em] opacity-70 block font-bold">SET AMOUNT</span>
                                     <span className="text-[1.5em] block bg-white/20 px-1 rounded">{activeSiloData?.capacitySet || '0'} T</span>
                                 </div>
                             </div>
                        </div>
                    </div>
               </div>
           </div>
      );
  };

  const renderSection = (sectionId: string, index: number) => {
      let content;
      switch(sectionId) {
          case 'header': content = renderHeader(); break;
          case 'scheduler': content = renderScheduler(); break;
          case 'catalyst': content = renderCatalyst(); break;
          default: content = null;
      }

      if (!content) return null;

      if (isDesignMode) {
          return (
              <div key={sectionId} className="relative group p-4 border-2 border-dashed border-blue-400 rounded-xl bg-blue-50/50 mb-4 transition-all hover:bg-blue-100/50">
                  <div className="absolute top-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => moveSection(index, 'up')} 
                        disabled={index === 0}
                        className="p-1 bg-white rounded border border-blue-300 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed text-blue-700"
                        title="Move Up"
                      >
                          <ArrowUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => moveSection(index, 'down')}
                        disabled={index === config.layoutOrder.length - 1}
                        className="p-1 bg-white rounded border border-blue-300 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed text-blue-700"
                        title="Move Down"
                      >
                          <ArrowDown className="w-4 h-4" />
                      </button>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded shadow-sm z-30 pointer-events-none">
                      {SECTIONS[sectionId as keyof typeof SECTIONS]}
                  </div>
                  {content}
              </div>
          );
      }

      return <div key={sectionId}>{content}</div>;
  };

  return (
    <div 
        className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-sm relative transition-colors duration-300 ${config.theme}`}
        style={{ zoom: zoomLevel }}
    >
      
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
        <div className="bg-emerald-600 text-white p-3 text-center sticky top-0 z-50 shadow-lg animate-in slide-in-from-top flex flex-col md:flex-row items-center justify-center gap-4">
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
        <div className="bg-red-600 text-white p-4 text-center sticky top-0 z-50 shadow-2xl flex flex-col items-center justify-center">
            <div className="flex items-center gap-3 animate-pulse">
                <Ban className="w-8 h-8" />
                <span className="font-black text-2xl tracking-widest">SYSTEM STOPPED</span>
            </div>
            <p className="text-red-100 font-mono text-sm mt-1">ALL INTERVALS & ALERTS FROZEN</p>
        </div>
      )}

      {/* Audio Permission Banner */}
      {!audioAllowed && config.audioEnabled && (
          <div className="bg-yellow-500 text-black p-2 text-center sticky top-0 z-50 cursor-pointer hover:bg-yellow-400 transition-colors" onClick={enableAudio}>
              <div className="flex items-center justify-center gap-2 font-bold">
                  <VolumeX className="w-5 h-5" />
                  <span>Audio is enabled but blocked by browser. Click here to enable sound effects!</span>
              </div>
          </div>
      )}

      {/* Dynamic Layout Rendering */}
      <div className="flex-1 overflow-auto p-2 flex flex-col gap-4">
          {config.layoutOrder.map((sectionId, index) => renderSection(sectionId, index))}
          
          {/* Always render these if selected in view, regardless of layout order, but put them at end if not in layout (fallback) */}
          {currentView === 'demonomer' && (
            <Demonomer 
                currentGrade={config.currentGrade} 
                onGradeChange={(g) => handleConfigChange('currentGrade', g)} 
                data={demonomerData}
                onDataChange={handleDemonomerChange}
            />
          )}
          
          {currentView === 'silo' && (
            <Silo 
                activeSilo={siloState.activeSilo}
                silos={siloState.silos}
                onDataChange={handleSiloDataChange}
                onSiloSelect={handleSiloSwitch}
            />
          )}
      </div>

      <div className="max-w-7xl mx-auto mt-6 pb-6 text-center text-slate-400 dark:text-slate-500 text-xs">
          AILO CORP | SCHEDULE START PVC 5
      </div>

      {/* --- START SILO CONFIRMATION MODAL --- */}
      {startSiloData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 ring-4 ring-emerald-500/50">
                  {/* Header */}
                  <div className="bg-emerald-600 text-white p-6 flex items-center justify-between">
                      <div>
                          <h3 className="text-2xl font-black flex items-center gap-2">
                              <PlayCircle className="w-8 h-8 text-yellow-300" />
                              START SILO {startSiloData.id}
                          </h3>
                          <p className="text-emerald-100 font-bold text-sm mt-1">Please confirm start details.</p>
                      </div>
                      <button onClick={() => setStartSiloData(null)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-6">
                      
                      {/* Lot Number Input */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Lot Number</label>
                          <input 
                              type="text" 
                              autoFocus
                              value={startSiloData.lotNumber}
                              onChange={(e) => setStartSiloData({...startSiloData, lotNumber: e.target.value})}
                              placeholder="e.g. E5ZB16"
                              className="w-full text-center text-3xl font-black p-3 rounded-xl border-2 border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none uppercase dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                      </div>

                      {/* Capacity Input */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Capacity Set (T)</label>
                          <input 
                              type="number" 
                              value={startSiloData.capacitySet}
                              onChange={(e) => setStartSiloData({...startSiloData, capacitySet: e.target.value})}
                              placeholder="e.g. 270"
                              className="w-full text-center text-3xl font-black p-3 rounded-xl border-2 border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                      </div>

                      {/* Time Input */}
                      <div className="space-y-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Start Time Confirmation</label>
                          <input 
                              type="text" 
                              value={startSiloData.startTime}
                              onChange={(e) => setStartSiloData({...startSiloData, startTime: e.target.value})}
                              className="w-full bg-transparent text-center font-mono font-bold text-xl outline-none border-b-2 border-slate-300 focus:border-emerald-500"
                          />
                      </div>

                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                      <button 
                        onClick={() => setStartSiloData(null)}
                        className="flex-1 py-4 font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                          CANCEL
                      </button>
                      <button 
                        onClick={handleConfirmSiloStart}
                        disabled={!startSiloData.lotNumber || !startSiloData.capacitySet}
                        className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                      >
                          <Check className="w-6 h-6" />
                          CONFIRM & START
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- Silo Adjustment Modal (View All) --- */}
      {isSiloModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="bg-slate-800 dark:bg-slate-950 text-white p-4 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-lg font-bold flex items-center gap-2">
                              <Database className="w-5 h-5 text-cyan-400" />
                              Silo Configuration
                          </h3>
                          <p className="text-xs text-slate-400">
                              Manage Lot Numbers, Start/Finish Times, and Updates
                          </p>
                      </div>
                      <button onClick={() => setIsSiloModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  {/* Modal Content */}
                  <div className="p-4 overflow-y-auto bg-slate-100 dark:bg-slate-900">
                      <Silo 
                          activeSilo={siloState.activeSilo}
                          silos={siloState.silos}
                          onDataChange={handleSiloDataChange}
                          onSiloSelect={handleSiloSwitch}
                      />
                  </div>
              </div>
          </div>
      )}

      {/* ... [Reschedule Modal] ... */}
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
                        <div className="mt-3">
                            <input 
                                type="text" 
                                value={editForm.stageInfo} 
                                onChange={(e) => setEditForm(prev => ({...prev, stageInfo: e.target.value}))}
                                placeholder="Or type custom label..."
                                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded p-2 text-sm font-bold focus:ring-2 focus:ring-fuchsia-500 outline-none"
                            />
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
                                    <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {editForm.shiftSubsequent ? 'Continue Interval (Shift Active)' : 'Stop Running Interval (Shift Schedule)'}
                                    </span>
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

      {/* --- Reset Sequence Modal --- */}
      {isResetModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 ring-4 ring-red-500/50">
                  {/* Header */}
                  <div className="bg-red-600 text-white p-6 flex items-center justify-between">
                      <div>
                          <h3 className="text-2xl font-black flex items-center gap-2">
                              <RotateCcw className="w-8 h-8 text-yellow-300" />
                              RESET SEQUENCE
                          </h3>
                          <p className="text-red-100 font-bold text-sm mt-1">Start new cycle & reset status.</p>
                      </div>
                      <button onClick={() => setIsResetModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-6">
                      
                      {/* Batch Number Input */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">New Start Batch Number</label>
                          <input 
                              type="number" 
                              autoFocus
                              value={resetParams.batch}
                              onChange={(e) => setResetParams({...resetParams, batch: parseInt(e.target.value) || 0})}
                              className="w-full text-center text-3xl font-black p-3 rounded-xl border-2 border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                      </div>

                      {/* Time Input */}
                      <div className="space-y-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">New Start Time (Reactor S)</label>
                          <input 
                              type="datetime-local" 
                              value={resetParams.time}
                              onChange={(e) => setResetParams({...resetParams, time: e.target.value})}
                              className="w-full bg-transparent text-center font-mono font-bold text-xl outline-none border-b-2 border-slate-300 focus:border-red-500 dark:text-white"
                          />
                      </div>

                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                      <button 
                        onClick={() => setIsResetModalOpen(false)}
                        className="flex-1 py-4 font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                          CANCEL
                      </button>
                      <button 
                        onClick={submitResetSequence}
                        className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black text-lg py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                      >
                          <Check className="w-6 h-6" />
                          CONFIRM RESET
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;
