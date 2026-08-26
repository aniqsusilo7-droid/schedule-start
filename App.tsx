
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { REACTORS, GRADE_COLORS } from './constants';
import { AppState, ScheduleItem, ItemConfig, GradeType, SiloState, SiloData, DemonomerData, AlarmSoundType, AlertStyleType } from './types';
import { addMinutes, formatDate, formatTime, getBatchDate } from './utils/dateUtils';
import { Demonomer } from './components/Demonomer';
import { Silo } from './components/Silo';
import { Catatan } from './components/Catatan';
import { Kesepakatan } from './components/Kesepakatan';
import { Jadwal, GroupKey, GROUP_THEMES } from './components/Jadwal';
import { KasGrup } from './components/KasGrup';
import { JadwalShift } from './components/JadwalShift';
import { Sidebar, SidebarView, GroupedView } from './components/Sidebar';
import { useMediaQuery, DESKTOP_QUERY } from './utils/useMediaQuery';
import { getShiftGroupsNow, getAdministrativeShiftDate, getActiveShifts, SHIFT_SLOTS, ShiftGroup } from './utils/shiftSchedule';
import { Settings, RefreshCw, AlertTriangle, Calendar, CalendarDays, Hash, Volume2, VolumeX, Edit3, X, PlayCircle, Clock as ClockIcon, FileText, Ban, FastForward, PauseCircle, ArrowRightCircle, CheckCircle2, Wrench, RotateCcw, Power, Bell, Timer, ChevronDown, ChevronUp, Info, Tag, ArrowRight, ArrowRightLeft, LayoutGrid, Activity, Database, Type, Sun, Moon, Pause, Play, Save, Gauge, Move, ArrowUp, ArrowDown, Palette, ZoomIn, ZoomOut, Monitor, Maximize2, Check, Calculator, StickyNote, Handshake, Trash2, Sliders, Eye, Sparkles, ShieldAlert, TrendingUp, Wallet, Menu } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Reorder } from 'framer-motion';
import { Fie2002TrendModal, Fie2002TrendEntry } from './components/Fie2002TrendModal';
import { DraggableModal } from './components/DraggableModal';
import { UnitConverter } from './components/UnitConverter';
import { NumberTicker } from './components/NumberTicker';

const GRADES: GradeType[] = ['SM', 'SLK', 'SLP', 'SE', 'SR'];
const STAGE_OPTIONS = ['Sample Blowing', 'Sample Washing', 'Sample Air Slurry'];

/* Lebar tabel scheduler di HP. Kolom reaktor dipersempit dan dibuat sticky,
   sisanya digeser horizontal. */
const MOBILE_REACTOR_COL = 56;
const MOBILE_CELL_MIN = 104;

/* Label & ikon tiap halaman, dipakai breadcrumb di header. */
const VIEW_META: Record<SidebarView, { label: string; Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  scheduler: { label: 'POLYMER',       Icon: LayoutGrid, color: 'text-blue-500' },
  demonomer: { label: 'DEMONOMER',     Icon: Activity,   color: 'text-teal-500' },
  silo:      { label: 'SILO',          Icon: Database,   color: 'text-cyan-500' },
  jadwalShift: { label: 'JADWAL SHIFT', Icon: CalendarDays, color: 'text-rose-500' },
  jadwal:    { label: 'JADWAL BACKUP', Icon: Calendar,   color: 'text-amber-500' },
  kas:       { label: 'KAS GRUP',      Icon: Wallet,     color: 'text-violet-500' },
  catatan:   { label: 'CATATAN',       Icon: FileText,   color: 'text-emerald-500' },
  unitConverter: { label: 'KONVERSI UNIT', Icon: ArrowRightLeft, color: 'text-cyan-500' },
};

/* Warna grup mengikuti tema grup di halaman Jadwal/Kas agar konsisten. */
const SHIFT_GROUP_COLOR: Record<ShiftGroup, string> = {
  A: 'bg-blue-600 text-white',
  B: 'bg-emerald-600 text-white',
  C: 'bg-purple-600 text-white',
  D: 'bg-amber-500 text-slate-950',
};

/** Grup yang memegang tiap shift hari ini. Berganti otomatis tiap tanggal,
    dan menyorot shift yang sedang berjalan menurut jam saat ini. */
const ShiftToday: React.FC<{ date: Date; className?: string }> = ({ date, className = '' }) => {
  /* Roster memakai tanggal administratif yang berganti pukul 23:00. Shift I
     tanggal berikutnya masuk 15 menit lebih awal untuk serah terima. */
  const assignment = getShiftGroupsNow(date);
  const administrativeDate = getAdministrativeShiftDate(date);
  const active = getActiveShifts(date);
  const [hours, minutes, seconds] = date
    .toLocaleTimeString('en-GB', { hour12: false })
    .split(':');
  /* Dua shift aktif berarti sedang dalam 15 menit serah terima. */
  const isHandover = active.length > 1;

  return (
    /* Basis sengaja tanpa kelas `display`: pemanggil yang menentukan lewat
       `hidden lg:flex`, supaya tidak ada dua kelas display yang bertabrakan. */
    <div className={`flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden ${className}`}>

      {/* Tanggal: dipindah ke sini dari bawah judul agar jadi satu kartu. */}
      <div className="flex items-center justify-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700">
        <Calendar className="w-[0.85em] h-[0.85em] text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-[0.95em] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 whitespace-nowrap leading-none">
          {formatDate(administrativeDate)}
        </span>
        <span aria-hidden="true" className="h-[1.1em] w-px bg-slate-300 dark:bg-slate-700" />
        <time
          dateTime={date.toISOString()}
          aria-label={`Pukul ${hours}:${minutes}:${seconds}`}
          className="flex items-center gap-1 font-mono font-black text-[0.95em] tracking-wider text-slate-700 dark:text-slate-200 whitespace-nowrap leading-none tabular-nums"
        >
          <ClockIcon className="w-[0.85em] h-[0.85em] text-cyan-500 shrink-0" />
          <span>{hours}</span>
          <span className="text-cyan-500 animate-pulse">:</span>
          <span>{minutes}</span>
          <span className="text-cyan-500 animate-pulse">:</span>
          <span className="text-cyan-600 dark:text-cyan-400">{seconds}</span>
        </time>
        {isHandover && (
          <span className="text-[0.42em] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 whitespace-nowrap">
            Serah Terima
          </span>
        )}
      </div>

      <div className="flex flex-1 items-stretch">
        {SHIFT_SLOTS.map((slot, i) => {
          const isActive = active.includes(slot);
          return (
            <div
              key={slot}
              className={`flex-1 flex flex-col min-w-0 transition-colors ${
                i > 0 ? 'border-l border-slate-200 dark:border-slate-700' : ''
              }`}
            >
              {/* Label shift: tanpa latar, hanya warna teks yang menandai aktif. */}
              <span className={`px-2.5 lg:px-8 py-1 lg:py-1.5 text-[0.58em] font-black uppercase tracking-widest text-center whitespace-nowrap leading-none ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                Shift {slot}
              </span>

              {/* Nama grup: warnanya memenuhi lebar dan sisa tinggi sel. */}
              <span className={`flex-1 flex items-center justify-center px-2 py-1.5 lg:py-2.5 text-[0.75em] font-black uppercase tracking-wider whitespace-nowrap leading-none ${SHIFT_GROUP_COLOR[assignment[slot]]} ${
                isActive ? '' : 'opacity-40'
              }`}>
                Grup {assignment[slot]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Breadcrumb: React.FC<{ view: SidebarView; group: GroupKey }> = ({ view, group }) => {
  const meta = VIEW_META[view];
  const showGroup = view === 'jadwal' || view === 'kas';
  return (
    <div className="lg:hidden flex items-center gap-2 shrink-0 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
      <meta.Icon className={`w-3.5 h-3.5 shrink-0 ${meta.color}`} />
      {/* Di HP label diganti badge grup saja bila ada, supaya tidak
          mendesak judul keluar layar. */}
      <span className={`text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 ${
        showGroup ? 'hidden' : 'inline'
      }`}>
        {meta.label}
      </span>
      {showGroup && (
        <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${GROUP_THEMES[group].activeTabBg}`}>
          {group}
        </span>
      )}
    </div>
  );
};

// Helper to generate 7-day default sample trend history for FIE2002 (168 hours)
const generateDefaultFie2002History = (baseVal: number = 125): Fie2002TrendEntry[] => {
  const history: Fie2002TrendEntry[] = [];
  const now = new Date();
  const totalHours = 168; // 7 days = 168 hours
  for (let i = totalHours; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600 * 1000);
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:00`;
    const fullTimeStr = `${dateStr} ${timeStr}`;
    const minuteKey = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:00`;
    const wave = Math.sin(i * 0.25) * 8 + (Math.cos(i * 0.5) * 4);
    const val = Number((baseVal + wave).toFixed(1));
    history.push({
      id: `fie_sample_${i}_${d.getTime()}`,
      timestamp: d.getTime(),
      timeString: fullTimeStr,
      hourKey: minuteKey,
      value: val,
      note: i === 0 ? 'Nilai Terkini' : undefined
    });
  }
  return history;
};

// Global AudioContext to prevent autoplay issues in background tabs
let globalAudioCtx: AudioContext | null = null;

const initAudioContext = () => {
    if (!globalAudioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            globalAudioCtx = new AudioContextClass();
        }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
    }
    return globalAudioCtx;
};

// Web Audio API Sound Effects
const playAlarmSound = (type: AlarmSoundType) => {
    try {
        if (type === 'fajar_sadboy') {
            // Replace with Gaspol Dangak Song (10 seconds, loud volume)
            const ctx = initAudioContext();
            if (!ctx) return;
            const t = ctx.currentTime;
            const duration = 10.0;
            
            // We want it to be loud, so we use a high-gain node (boosted 3x: 0.8 * 3 = 2.4)
            const mainGain = ctx.createGain();
            mainGain.gain.setValueAtTime(0, t);
            mainGain.gain.linearRampToValueAtTime(2.4, t + 0.1); // Extremely loud sound!
            mainGain.gain.setValueAtTime(2.4, t + duration - 0.5);
            mainGain.gain.linearRampToValueAtTime(0, t + duration);
            mainGain.connect(ctx.destination);

            // Dangdut drum beats ("Dang" and "Dut") scheduled over 10 seconds
            // "Dut" is a deep low-frequency drum slide, "Dang" is a bright high-frequency slap.
            const bpm = 135;
            const beatDuration = 60 / bpm; // ~0.44s
            const totalBeats = Math.floor(duration / beatDuration);

            for (let beat = 0; beat < totalBeats; beat++) {
                const beatTime = t + beat * beatDuration;
                
                // Let's create a "Dut" sound on beat start
                // Low frequency tom-like sweep: 150Hz -> 60Hz
                const dutOsc = ctx.createOscillator();
                const dutGain = ctx.createGain();
                dutOsc.type = 'sine';
                dutOsc.frequency.setValueAtTime(150, beatTime);
                dutOsc.frequency.exponentialRampToValueAtTime(60, beatTime + 0.15);
                
                dutGain.gain.setValueAtTime(1.2, beatTime); // Boosted 3x from 0.4
                dutGain.gain.exponentialRampToValueAtTime(0.01, beatTime + 0.15);
                
                dutOsc.connect(dutGain);
                dutGain.connect(mainGain);
                dutOsc.start(beatTime);
                dutOsc.stop(beatTime + 0.15);

                // Create a "Dang" sound on the off-beat (halfway through the beat)
                const dangTime = beatTime + beatDuration * 0.5;
                if (dangTime < t + duration) {
                    const dangOsc = ctx.createOscillator();
                    const dangGain = ctx.createGain();
                    dangOsc.type = 'triangle';
                    dangOsc.frequency.setValueAtTime(320, dangTime);
                    dangOsc.frequency.exponentialRampToValueAtTime(280, dangTime + 0.1);

                    dangGain.gain.setValueAtTime(0.9, dangTime); // Boosted 3x from 0.3
                    dangGain.gain.exponentialRampToValueAtTime(0.01, dangTime + 0.1);

                    dangOsc.connect(dangGain);
                    dangGain.connect(mainGain);
                    dangOsc.start(dangTime);
                    dangOsc.stop(dangTime + 0.1);
                }
            }

            // High-octave driving melody (Indonesian organ tunggal style)
            const melody = [
                440.00, 523.25, 659.25, 587.33, 523.25, 493.88, 440.00, 493.88,
                523.25, 659.25, 880.00, 783.99, 659.25, 587.33, 523.25, 493.88,
                523.25, 587.33, 659.25, 880.00, 987.77, 880.00, 783.99, 659.25,
                587.33, 659.25, 587.33, 523.25, 493.88, 440.00, 392.00, 440.00
            ];

            const noteDuration = beatDuration * 0.5; // Eighth notes
            const totalNotes = Math.floor(duration / noteDuration);

            for (let i = 0; i < totalNotes; i++) {
                const noteTime = t + i * noteDuration;
                const freq = melody[i % melody.length];

                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, noteTime);

                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1200, noteTime);
                filter.Q.setValueAtTime(1.5, noteTime);

                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(1.5, noteTime + 0.02); // Boosted 3x from 0.5
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + noteDuration - 0.02);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(mainGain);

                osc.start(noteTime);
                osc.stop(noteTime + noteDuration);
            }
            return;
        }

        const ctx = initAudioContext();
        if (!ctx) return;

        const t = ctx.currentTime;
        const duration = 12.0; 

        if (type === 'siren') {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, t);
            for (let i = 0; i < duration * 2; i++) {
                osc.frequency.linearRampToValueAtTime(1200, t + i * 0.5 + 0.25);
                osc.frequency.linearRampToValueAtTime(600, t + i * 0.5 + 0.5);
            }
            gainNode.gain.setValueAtTime(0, t);
            gainNode.gain.linearRampToValueAtTime(0.1, t + 0.1);
            gainNode.gain.setValueAtTime(0.1, t + duration - 0.5);
            gainNode.gain.linearRampToValueAtTime(0, t + duration);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + duration);
        } else if (type === 'rocket') {
            // Rocket sound: low frequency noise sweeping up (3x of 2x = 6x volume)
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(100, t);
            filter.frequency.exponentialRampToValueAtTime(1000, t + duration);
            
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0, t);
            gainNode.gain.linearRampToValueAtTime(3.0, t + 1); // 3x volume boost (was 1.0)
            gainNode.gain.linearRampToValueAtTime(0, t + duration);
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            noise.start(t);
        } else if (type === 'jet') {
            // Jet sound: white noise with bandpass filter sweeping (3x of 2x = 6x volume)
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(5000, t);
            filter.frequency.exponentialRampToValueAtTime(200, t + duration);
            
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0, t);
            gainNode.gain.linearRampToValueAtTime(1.8, t + 2); // 3x volume boost (was 0.6)
            gainNode.gain.setValueAtTime(1.8, t + duration - 2); // 3x volume boost (was 0.6)
            gainNode.gain.linearRampToValueAtTime(0, t + duration);
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            noise.start(t);
        } else if (type === 'powerpoint') {
            // PowerPoint animation chime (3x of 2x = 6x volume)
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, t); // A5
            osc.frequency.setValueAtTime(1108.73, t + 0.1); // C#6
            osc.frequency.setValueAtTime(1318.51, t + 0.2); // E6
            
            gainNode.gain.setValueAtTime(0, t);
            gainNode.gain.linearRampToValueAtTime(1.2, t + 0.05); // 3x volume boost (was 0.4)
            gainNode.gain.exponentialRampToValueAtTime(0.06, t + 1); // 3x volume boost (was 0.02)
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 1);
        } else if (type === 'bomb') {
            // Bomb sound: low frequency drop followed by noise burst (3x of 2x = 6x volume)
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(0.01, t + 1);
            oscGain.gain.setValueAtTime(3.0, t); // 3x volume boost (was 1.0)
            oscGain.gain.exponentialRampToValueAtTime(0.06, t + 1); // 3x volume boost (was 0.02)
            osc.connect(oscGain);
            oscGain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 1);

            setTimeout(() => {
                const noiseCtx = initAudioContext();
                if (!noiseCtx) return;
                const nt = noiseCtx.currentTime;
                const bufferSize = noiseCtx.sampleRate * 2;
                const buffer = noiseCtx.createBuffer(1, bufferSize, noiseCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = noiseCtx.createBufferSource();
                noise.buffer = buffer;
                
                const filter = noiseCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1000, nt);
                filter.frequency.exponentialRampToValueAtTime(100, nt + 2);
                
                const gainNode = noiseCtx.createGain();
                gainNode.gain.setValueAtTime(6.0, nt); // 3x volume boost (was 2.0)
                gainNode.gain.exponentialRampToValueAtTime(0.06, nt + 2); // 3x volume boost (was 0.02)
                
                noise.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(noiseCtx.destination);
                noise.start(nt);
            }, 1000);
        } else if (type === 'train') {
            // Train Chugger & Whistle (3x of 2x = 6x volume)
            for (let i = 0; i < 4; i++) {
                const chugTime = t + i * 0.4;
                const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
                const noiseData = noiseBuffer.getChannelData(0);
                for (let j = 0; j < noiseData.length; j++) {
                    noiseData[j] = Math.random() * 2 - 1;
                }
                const noiseSource = ctx.createBufferSource();
                noiseSource.buffer = noiseBuffer;
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(250, chugTime);
                
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, chugTime);
                gain.gain.linearRampToValueAtTime(1.8, chugTime + 0.02); // 3x volume boost (was 0.6)
                gain.gain.exponentialRampToValueAtTime(0.06, chugTime + 0.15); // 3x volume boost (was 0.02)
                
                noiseSource.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                noiseSource.start(chugTime);
                noiseSource.stop(chugTime + 0.15);
            }
            const whistleStart = t + 1.6;
            const whistleDuration = 1.2;
            [400, 480].forEach(freq => {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, whistleStart);
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1000, whistleStart);
                
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, whistleStart);
                gain.gain.linearRampToValueAtTime(0.9, whistleStart + 0.1); // 3x volume boost (was 0.3)
                gain.gain.setValueAtTime(0.9, whistleStart + whistleDuration - 0.2); // 3x volume boost (was 0.3)
                gain.gain.exponentialRampToValueAtTime(0.006, whistleStart + whistleDuration); // 3x volume boost (was 0.002)
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(whistleStart);
                osc.stop(whistleStart + whistleDuration);
            });
        } else if (type === 'car_horn') {
            // Beep beep! (3x of 2x = 6x volume)
            [t, t + 0.4].forEach(startTime => {
                const duration = 0.25;
                [400, 450].forEach(freq => {
                    const osc = ctx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, startTime);
                    
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(1200, startTime);
                    
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0, startTime);
                    gain.gain.linearRampToValueAtTime(1.2, startTime + 0.02); // 3x volume boost (was 0.4)
                    gain.gain.setValueAtTime(1.2, startTime + duration - 0.02); // 3x volume boost (was 0.4)
                    gain.gain.linearRampToValueAtTime(0, startTime + duration);
                    
                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                });
            });
        } else if (type === 'ship_horn') {
            // Massive deep ocean liner horn (3x of 2x = 6x volume)
            const shipDuration = 2.5;
            [75, 110, 150].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, t);
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(300, t);
                
                const gain = ctx.createGain();
                const volume = idx === 0 ? 2.4 : 1.2; // 3x volume boost (was 0.8 / 0.4)
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(volume, t + 0.2);
                gain.gain.setValueAtTime(volume, t + shipDuration - 0.3);
                gain.gain.exponentialRampToValueAtTime(0.003, t + shipDuration); // 3x of 0.001
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + shipDuration);
            });
        } else if (type === 'ringtone') {
            // Digital arpeggio ringtone (3x of 2x = 6x volume)
            const notes = [659.25, 783.99, 987.77, 1318.51, 987.77, 1318.51, 1567.98];
            for (let loop = 0; loop < 2; loop++) {
                const baseTime = t + loop * 1.5;
                notes.forEach((freq, index) => {
                    const noteStart = baseTime + index * 0.15;
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, noteStart);
                    
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0, noteStart);
                    gain.gain.linearRampToValueAtTime(1.5, noteStart + 0.02); // 3x volume boost (was 0.5)
                    gain.gain.exponentialRampToValueAtTime(0.006, noteStart + 0.13); // 3x volume boost (was 0.002)
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(noteStart);
                    osc.stop(noteStart + 0.15);
                });
            }
        } else if (type === 'missile') {
            // Screaming downward sweep + explosion (3x of 2x = 6x volume)
            const missileDuration = 1.5;
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1500, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + missileDuration);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, t);
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(1.2, t + 0.1); // 3x volume boost (was 0.4)
            gain.gain.linearRampToValueAtTime(0.6, t + missileDuration); // 3x volume boost (was 0.2)
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(t);
            osc.stop(t + missileDuration);

            // Explosion
            const explosionTime = t + missileDuration;
            const bufferSize = ctx.sampleRate * 1.5;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            
            const expFilter = ctx.createBiquadFilter();
            expFilter.type = 'lowpass';
            expFilter.frequency.setValueAtTime(800, explosionTime);
            expFilter.frequency.exponentialRampToValueAtTime(40, explosionTime + 1.2);
            
            const expGain = ctx.createGain();
            expGain.gain.setValueAtTime(3.6, explosionTime); // 3x volume boost (was 1.2)
            expGain.gain.exponentialRampToValueAtTime(0.006, explosionTime + 1.2); // 3x volume boost (was 0.002)
            
            noise.connect(expFilter);
            expFilter.connect(expGain);
            expGain.connect(ctx.destination);
            noise.start(explosionTime);
            noise.stop(explosionTime + 1.5);
        } else if (type === 'crow') {
            // Crow caw-caw squawks (2 caws) (3x of 2x = 6x volume)
            [t, t + 0.6].forEach(startTime => {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(650, startTime);
                osc.frequency.linearRampToValueAtTime(550, startTime + 0.35);
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1000, startTime);
                filter.Q.setValueAtTime(3.0, startTime);
                
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(1.8, startTime + 0.05); // 3x volume boost (was 0.6)
                gain.gain.setValueAtTime(1.8, startTime + 0.2); // 3x volume boost (was 0.6)
                gain.gain.exponentialRampToValueAtTime(0.006, startTime + 0.4); // 3x volume boost (was 0.002)
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.4);
            });
        } else if (type === 'magic_spell') {
            // Magical glistening arpeggio (3x of 2x = 6x volume)
            const scale = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
            scale.forEach((freq, index) => {
                const noteTime = t + index * 0.1;
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);
                osc.frequency.linearRampToValueAtTime(freq + 10, noteTime + 0.25);
                
                const delay = ctx.createDelay();
                delay.delayTime.setValueAtTime(0.08, noteTime);
                
                const gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(0, noteTime);
                gainNode.gain.linearRampToValueAtTime(0.9, noteTime + 0.02); // 3x volume boost (was 0.3)
                gainNode.gain.exponentialRampToValueAtTime(0.006, noteTime + 0.4); // 3x volume boost (was 0.002)
                
                osc.connect(gainNode);
                gainNode.connect(delay);
                delay.connect(ctx.destination);
                gainNode.connect(ctx.destination);
                
                osc.start(noteTime);
                osc.stop(noteTime + 0.5);
            });
        } else if (type === 'ufo') {
            // Alien ship hover with vibrato (3x of 2x = 6x volume)
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(12, t);
            
            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(80, t);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, t);
            
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0, t);
            gainNode.gain.linearRampToValueAtTime(2.1, t + 0.3); // 3x volume boost (was 0.7)
            
            osc.frequency.linearRampToValueAtTime(400, t + 1.5);
            osc.frequency.linearRampToValueAtTime(150, t + 3.0);
            
            gainNode.gain.setValueAtTime(2.1, t + 2.7); // 3x volume boost (was 0.7)
            gainNode.gain.exponentialRampToValueAtTime(0.006, t + 3.0); // 3x volume boost (was 0.002)
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            lfo.start(t);
            osc.start(t);
            
            lfo.stop(t + 3.0);
            osc.stop(t + 3.0);
        } else if (type === 'laser') {
            // Rapid sci-fi laser pulses (3x of 2x = 6x volume)
            for (let i = 0; i < 5; i++) {
                const laserTime = t + i * 0.25;
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1800, laserTime);
                osc.frequency.exponentialRampToValueAtTime(80, laserTime + 0.18);
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000, laserTime);
                
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, laserTime);
                gain.gain.linearRampToValueAtTime(1.2, laserTime + 0.01); // 3x volume boost (was 0.4)
                gain.gain.exponentialRampToValueAtTime(0.006, laserTime + 0.18); // 3x volume boost (was 0.002)
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(laserTime);
                osc.stop(laserTime + 0.18);
            }
        } else if (type === 'telephone') {
            // Classic rotary telephone ring (3x of 2x = 6x volume)
            [t, t + 1.2].forEach(ringTime => {
                const duration = 0.8;
                const modOsc = ctx.createOscillator();
                modOsc.type = 'square';
                modOsc.frequency.setValueAtTime(16, ringTime);
                
                const modGain = ctx.createGain();
                modGain.gain.setValueAtTime(2.4, ringTime); // 3x volume boost (was 0.8)
                
                [1100, 1250].forEach(freq => {
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, ringTime);
                    
                    const strikeGain = ctx.createGain();
                    strikeGain.gain.setValueAtTime(0, ringTime);
                    strikeGain.gain.linearRampToValueAtTime(1.2, ringTime + 0.02); // 3x volume boost (was 0.4)
                    strikeGain.gain.setValueAtTime(1.2, ringTime + duration - 0.05); // 3x volume boost (was 0.4)
                    strikeGain.gain.exponentialRampToValueAtTime(0.006, ringTime + duration); // 3x volume boost (was 0.002)
                    
                    osc.connect(strikeGain);
                    modGain.connect(strikeGain.gain);
                    strikeGain.connect(ctx.destination);
                    
                    osc.start(ringTime);
                    osc.stop(ringTime + duration);
                });
                modOsc.start(ringTime);
                modOsc.stop(ringTime + duration);
            });
        } else if (type === 'arcade') {
            // Bouncy 8-bit game victory melody (3x of 2x = 6x volume)
            const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25, 659.25];
            notes.forEach((freq, index) => {
                const noteTime = t + index * 0.12;
                const osc = ctx.createOscillator();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, noteTime);
                
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.72, noteTime + 0.01); // 3x volume boost (was 0.24)
                gain.gain.exponentialRampToValueAtTime(0.006, noteTime + 0.1); // 3x volume boost (was 0.002)
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + 0.12);
            });
        } else if (type === 'gong') {
            // Epic deep temple gong (3x of 2x = 6x volume)
            const freqs = [100, 142, 224, 335, 470, 680];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(400, t);
                
                const gain = ctx.createGain();
                const initVol = idx === 0 ? 1.8 : 0.6; // 3x volume boost (was 0.6 / 0.2)
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(initVol, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.006, t + 4.0); // 3x of 0.002
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(t);
                osc.stop(t + 4.0);
            });
        } else if (type === 'siren_polisi') {
            // Police Siren (Siren Polisi) - 10 seconds, loud volume (gain 2.4)
            const duration = 10.0;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, t);
            for (let i = 0; i < duration * 4; i++) {
                osc.frequency.linearRampToValueAtTime(1400, t + i * 0.25 + 0.125);
                osc.frequency.linearRampToValueAtTime(800, t + i * 0.25 + 0.25);
            }
            gainNode.gain.setValueAtTime(0, t);
            gainNode.gain.linearRampToValueAtTime(2.4, t + 0.1);
            gainNode.gain.setValueAtTime(2.4, t + duration - 0.5);
            gainNode.gain.linearRampToValueAtTime(0, t + duration);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3000, t);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + duration);
        } else if (type === 'siren_kebakaran') {
            // Fire Siren (Siren Kebakaran) - 10 seconds, loud volume (gain 2.4)
            const duration = 10.0;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(350, t);
            for (let i = 0; i < duration / 2; i++) {
                osc.frequency.linearRampToValueAtTime(850, t + i * 2.0 + 1.0);
                osc.frequency.linearRampToValueAtTime(350, t + i * 2.0 + 2.0);
            }
            gainNode.gain.setValueAtTime(0, t);
            gainNode.gain.linearRampToValueAtTime(2.4, t + 0.1);
            gainNode.gain.setValueAtTime(2.4, t + duration - 0.5);
            gainNode.gain.linearRampToValueAtTime(0, t + duration);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, t);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + duration);
        } else if (type === 'kicau_mania') {
            // Bird Chirping (Kicau Mania) - 10 seconds, loud volume (gain 2.4)
            const duration = 10.0;
            const mainGain = ctx.createGain();
            mainGain.gain.setValueAtTime(0, t);
            mainGain.gain.linearRampToValueAtTime(2.4, t + 0.1);
            mainGain.gain.setValueAtTime(2.4, t + duration - 0.5);
            mainGain.gain.linearRampToValueAtTime(0, t + duration);
            mainGain.connect(ctx.destination);

            const chirpInterval = 0.4;
            const totalChirps = Math.floor(duration / chirpInterval);

            for (let i = 0; i < totalChirps; i++) {
                const chirpTime = t + i * chirpInterval;
                const offset = (Math.random() - 0.5) * 0.05;
                const startTime = chirpTime + offset;
                
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(1800 + Math.random() * 200, startTime);
                osc1.frequency.exponentialRampToValueAtTime(4000 + Math.random() * 300, startTime + 0.12);
                
                gain1.gain.setValueAtTime(0, startTime);
                gain1.gain.linearRampToValueAtTime(0.7, startTime + 0.02);
                gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
                
                osc1.connect(gain1);
                gain1.connect(mainGain);
                osc1.start(startTime);
                osc1.stop(startTime + 0.13);

                const secondaryTime = startTime + 0.16;
                if (secondaryTime < t + duration) {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(3500, secondaryTime);
                    osc2.frequency.exponentialRampToValueAtTime(2200, secondaryTime + 0.1);
                    
                    gain2.gain.setValueAtTime(0, secondaryTime);
                    gain2.gain.linearRampToValueAtTime(0.5, secondaryTime + 0.01);
                    gain2.gain.exponentialRampToValueAtTime(0.001, secondaryTime + 0.1);
                    
                    osc2.connect(gain2);
                    gain2.connect(mainGain);
                    osc2.start(secondaryTime);
                    osc2.stop(secondaryTime + 0.11);
                }
            }
        } else if (type === 'google_robot') {
            // Google/Robot Voice speaking: "WOOOOOYYYY WOOOOOOYYYYY STAARTTT STAAAARTTT STARTTTT"
            // Combined with a powerful robotic warning sound in Web Audio API so it's super loud
            const ctx = initAudioContext();
            if (ctx) {
                const t = ctx.currentTime;
                const duration = 10.0;
                
                // Very loud synth alarm background (gain 2.4)
                const mainGain = ctx.createGain();
                mainGain.gain.setValueAtTime(0, t);
                mainGain.gain.linearRampToValueAtTime(2.4, t + 0.1);
                mainGain.gain.setValueAtTime(2.4, t + duration - 0.5);
                mainGain.gain.linearRampToValueAtTime(0, t + duration);
                mainGain.connect(ctx.destination);
                
                // Pulsing robot energy sound (heavy low-end buzz + filter sweeps)
                const pulseCount = 10;
                for (let i = 0; i < pulseCount; i++) {
                    const startTime = t + i * 1.0;
                    
                    const osc = ctx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(80, startTime);
                    osc.frequency.linearRampToValueAtTime(220, startTime + 0.5);
                    osc.frequency.linearRampToValueAtTime(80, startTime + 1.0);
                    
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'peaking';
                    filter.frequency.setValueAtTime(800, startTime);
                    filter.frequency.exponentialRampToValueAtTime(3000, startTime + 0.3);
                    filter.frequency.exponentialRampToValueAtTime(500, startTime + 1.0);
                    filter.Q.setValueAtTime(5, startTime);
                    
                    const pGain = ctx.createGain();
                    pGain.gain.setValueAtTime(0, startTime);
                    pGain.gain.linearRampToValueAtTime(0.6, startTime + 0.1);
                    pGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.95);
                    
                    osc.connect(filter);
                    filter.connect(pGain);
                    pGain.connect(mainGain);
                    
                    osc.start(startTime);
                    osc.stop(startTime + 1.0);
                }
            }

            // Speak the text
            try {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel(); // Cancel any ongoing speech
                    
                    const speakSentence = () => {
                        const utterance = new SpeechSynthesisUtterance("WOOOOOYYYY WOOOOOOYYYYY  STAARTTT STAAAARTTT STARTTTT");
                        utterance.rate = 1.0;
                        utterance.pitch = 0.5; // masculine / robotic pitch
                        utterance.volume = 1.0; // max volume
                        
                        // Select a male voice if available
                        const voices = window.speechSynthesis.getVoices();
                        const maleVoice = voices.find(v => 
                            v.name.toLowerCase().includes('male') || 
                            v.name.toLowerCase().includes('david') || 
                            v.name.toLowerCase().includes('google uk english male') ||
                            v.name.toLowerCase().includes('id-id')
                        );
                        if (maleVoice) {
                            utterance.voice = maleVoice;
                        }
                        window.speechSynthesis.speak(utterance);
                    };

                    // Speak multiple times during the 10-second window
                    speakSentence();
                    setTimeout(() => {
                        speakSentence();
                    }, 4000);
                }
            } catch (speechErr) {
                console.error("Speech Synthesis Error:", speechErr);
            }
            return;
        }

    } catch (e) {
        console.error("Web Audio API Error:", e);
    }
};

// Available Sections for Layout
const SECTIONS = {
    header: 'Header & Controls',
    scheduler: 'Main Schedule Table',
    catalyst: 'Catalyst Input Section',
    demonomer: 'HITUNG STEAM RASIO DEMONOMER',
    silo: 'Silo Monitor'
};

const HEADER_COLOR_SCHEMES = [
  {
    // Scheme 0: Blue Glow Pulse
    schedule: "text-blue-600 dark:text-blue-400 font-black tracking-tight",
    start: "text-slate-800 dark:text-slate-100 font-black drop-shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-[pulse_2.5s_ease-in-out_infinite]",
    reaktor: "text-blue-600 dark:text-blue-400 font-extrabold tracking-widest",
    date: "text-blue-600 dark:text-blue-400 font-bold",
    headerBg: "bg-blue-50/80 dark:bg-blue-950/30",
    headerBorder: "border-blue-300/80 dark:border-blue-800/80 shadow-[0_0_15px_rgba(59,130,246,0.2)]",
    marqueeBg: "bg-blue-100 dark:bg-blue-900/50",
    marqueeText: "text-blue-900 dark:text-blue-100",
    marqueeBorder: "border-blue-200 dark:border-blue-800",
    marqueeGradientFrom: "from-blue-100 dark:from-slate-900/50",
    icon: "text-blue-600 dark:text-blue-400 animate-pulse",
    titleAnimClass: "animate-[pulse_3s_ease-in-out_infinite]"
  },
  {
    // Scheme 1: Emerald/Teal Shimmer Gradient
    schedule: "bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent font-black animate-[pulse_2s_infinite]",
    start: "bg-gradient-to-r from-teal-500 via-emerald-400 to-green-500 bg-clip-text text-transparent font-black animate-[pulse_2s_infinite]",
    reaktor: "text-emerald-600 dark:text-emerald-400 font-extrabold tracking-widest uppercase",
    date: "text-teal-600 dark:text-teal-400 font-bold",
    headerBg: "bg-emerald-50/80 dark:bg-emerald-950/30",
    headerBorder: "border-emerald-300/80 dark:border-emerald-800/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
    marqueeBg: "bg-emerald-100 dark:bg-emerald-950/60",
    marqueeText: "text-emerald-900 dark:text-emerald-100",
    marqueeBorder: "border-emerald-200 dark:border-emerald-800",
    marqueeGradientFrom: "from-emerald-100 dark:from-slate-900/50",
    icon: "text-emerald-600 dark:text-emerald-400",
    titleAnimClass: "animate-[pulse_2s_ease-in-out_infinite]"
  },
  {
    // Scheme 2: Amber/Gold Luxury Sparkle
    schedule: "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text text-transparent font-black drop-shadow-sm",
    start: "bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-500 bg-clip-text text-transparent font-black animate-[pulse_2.5s_infinite]",
    reaktor: "text-amber-600 dark:text-amber-400 font-black tracking-widest uppercase",
    date: "text-amber-600 dark:text-amber-400 font-bold",
    headerBg: "bg-amber-50/80 dark:bg-amber-950/30",
    headerBorder: "border-amber-300/80 dark:border-amber-800/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
    marqueeBg: "bg-amber-100 dark:bg-amber-950/60",
    marqueeText: "text-amber-900 dark:text-amber-100",
    marqueeBorder: "border-amber-200 dark:border-amber-800",
    marqueeGradientFrom: "from-amber-100 dark:from-slate-900/50",
    icon: "text-amber-600 dark:text-amber-400 animate-pulse",
    titleAnimClass: "animate-[pulse_2.5s_infinite]"
  },
  {
    // Scheme 3: Rose Sunset Radiant
    schedule: "bg-gradient-to-r from-rose-600 via-pink-500 to-rose-400 bg-clip-text text-transparent font-black",
    start: "text-rose-600 dark:text-rose-400 font-black drop-shadow-[0_0_10px_rgba(225,29,72,0.6)] animate-[pulse_1.8s_infinite]",
    reaktor: "text-rose-600 dark:text-rose-400 font-black tracking-widest uppercase",
    date: "text-pink-600 dark:text-pink-400 font-bold",
    headerBg: "bg-rose-50/80 dark:bg-rose-950/30",
    headerBorder: "border-rose-300/80 dark:border-rose-800/80 shadow-[0_0_15px_rgba(225,29,72,0.25)]",
    marqueeBg: "bg-rose-100 dark:bg-rose-950/60",
    marqueeText: "text-rose-900 dark:text-rose-100",
    marqueeBorder: "border-rose-200 dark:border-rose-800",
    marqueeGradientFrom: "from-rose-100 dark:from-slate-900/50",
    icon: "text-rose-600 dark:text-rose-400 animate-pulse",
    titleAnimClass: "animate-[pulse_1.8s_infinite]"
  },
  {
    // Scheme 4: Purple Cyber Motion
    schedule: "text-violet-600 dark:text-violet-400 font-black drop-shadow-[0_0_12px_rgba(139,92,246,0.7)]",
    start: "bg-gradient-to-r from-violet-500 via-purple-400 to-indigo-500 bg-clip-text text-transparent font-black animate-[bounce_3s_infinite]",
    reaktor: "text-violet-600 dark:text-violet-400 font-black tracking-widest uppercase",
    date: "text-violet-600 dark:text-violet-400 font-bold",
    headerBg: "bg-violet-50/80 dark:bg-violet-950/30",
    headerBorder: "border-violet-300/80 dark:border-violet-800/80 shadow-[0_0_15px_rgba(139,92,246,0.25)]",
    marqueeBg: "bg-violet-100 dark:bg-violet-950/60",
    marqueeText: "text-violet-900 dark:text-violet-100",
    marqueeBorder: "border-violet-200 dark:border-violet-800",
    marqueeGradientFrom: "from-violet-100 dark:from-slate-900/50",
    icon: "text-violet-600 dark:text-violet-400",
    titleAnimClass: "animate-[bounce_3s_infinite]"
  },
  {
    // Scheme 5: Cyan Neon Strobe
    schedule: "bg-gradient-to-r from-cyan-500 via-teal-300 to-lime-400 bg-clip-text text-transparent font-black drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]",
    start: "text-cyan-500 dark:text-cyan-300 font-black drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-[pulse_1.5s_infinite]",
    reaktor: "text-cyan-600 dark:text-cyan-300 font-black tracking-widest uppercase",
    date: "text-cyan-600 dark:text-cyan-400 font-bold",
    headerBg: "bg-cyan-50/80 dark:bg-cyan-950/30",
    headerBorder: "border-cyan-300/80 dark:border-cyan-800/80 shadow-[0_0_18px_rgba(6,182,212,0.3)]",
    marqueeBg: "bg-cyan-100 dark:bg-cyan-950/60",
    marqueeText: "text-cyan-900 dark:text-cyan-100",
    marqueeBorder: "border-cyan-200 dark:border-cyan-800",
    marqueeGradientFrom: "from-cyan-100 dark:from-slate-900/50",
    icon: "text-cyan-500 dark:text-cyan-400 animate-spin",
    titleAnimClass: "animate-[pulse_1.5s_infinite]"
  }
];

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<SidebarView>('scheduler');

  /* Di bawah 1024px tabel scheduler tidak muat, jadi struktur render diganti
     (tabel jadi kartu, sidebar jadi drawer) — bukan sekadar gaya. */
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  /* Grup shift aktif. Tiap grup adalah halaman tersendiri, jadi kombinasi
     currentView + currentGroup yang menentukan halaman mana yang tampil. */
  const [currentGroup, setCurrentGroup] = useState<GroupKey>(() => {
    const saved = localStorage.getItem('lastActiveGroup');
    return (saved as GroupKey) || 'GRUP D';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('sidebarCollapsed') === '1'
  );

  useEffect(() => {
    localStorage.setItem('lastActiveGroup', currentGroup);
  }, [currentGroup]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  const handleSelectGroup = useCallback((view: GroupedView, group: GroupKey) => {
    setCurrentView(view);
    setCurrentGroup(group);
  }, []);
  const [isDemonomerPopupOpen, setIsDemonomerPopupOpen] = useState(false);
  
  const [stoppedAt, setStoppedAt] = useState<number | null>(() => {
    const saved = localStorage.getItem('app_stopped_at');
    return saved ? Number(saved) : null;
  });

  const [now, setNow] = useState<Date>(() => {
    const isStoppedSaved = localStorage.getItem('app_is_stopped') === 'true';
    const savedStoppedAt = localStorage.getItem('app_stopped_at');
    if (isStoppedSaved && savedStoppedAt && !isNaN(Number(savedStoppedAt))) {
        return new Date(Number(savedStoppedAt));
    }
    return new Date();
  });
  
  // Determine current color scheme & 30s cycle index for header animation rotation
  const { currentColorScheme, cycle30s } = useMemo(() => {
    const timeMs = now.getTime();
    const cycle30s = Math.floor(timeMs / (30 * 1000));
    const schemeIndex = cycle30s % HEADER_COLOR_SCHEMES.length;
    return {
      currentColorScheme: HEADER_COLOR_SCHEMES[schemeIndex],
      cycle30s
    };
  }, [now]);
  
  // State for dismissed alerts (to allow closing the full screen overlay)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // State for the modal
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  
  // State for Reactor Note editing
  const [editingReactorNote, setEditingReactorNote] = useState<string | null>(null);
  const [tempReactorNote, setTempReactorNote] = useState("");

  // State for Silo START Confirmation Modal
  const [startSiloData, setStartSiloData] = useState<{
      id: 'O' | 'P' | 'Q';
      lotNumber: string;
      capacitySet: string;
      startTime: string;
  } | null>(null);
  
  // Zoom State (Supabase Persistence)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [shouldBlinkNote, setShouldBlinkNote] = useState(false);

  // Catalyst State (Supabase Persistence)
  const [catalystData, setCatalystData] = useState<any>({
    f: { netto: '24,9', bruto: '' },
    h: { netto: '10,8', bruto: '' },
    g: { netto: '', bruto: '' },
    presets: {
      SM: { F: '16,3', H: '25,7' },
      SLP: { F: '', H: '' },
      SLK: { F: '', H: '' },
      SE: { F: '', G: '' },
      SR: { F: '', G: '' }
    }
  });

  const [isCatalystModalOpen, setIsCatalystModalOpen] = useState(false);
  const [tempCatalystPresets, setTempCatalystPresets] = useState<Record<string, Record<string, string>>>({
    SM: { F: '16,3', H: '25,7' },
    SLP: { F: '', H: '' },
    SLK: { F: '', H: '' },
    SE: { F: '', G: '' },
    SR: { F: '', G: '' }
  });

  // Demonomer State (Supabase Persistence)
  const [demonomerData, setDemonomerData] = useState<DemonomerData>({
      f2002: 125,
      aie2802: 1070,
      pvcPercent: 25,
      multipliers: { SM: 118, SLP: 108, SLK: 128, SE: 140, SR: 100 },
      pvcFormula: "F2002*AI2802/1000*%PVC",
      steamFormula: "PVC * Steam Rasio",
      cycleTimeFormula: "(COMP - HOLD) + 2"
  });
  const [demonomerGrade, setDemonomerGrade] = useState<GradeType>('SM');
  const [isGradeChangeModalOpen, setIsGradeChangeModalOpen] = useState(false);
  const [tempSelectedGradeForChange, setTempSelectedGradeForChange] = useState<GradeType>('SM');

  const openGradeChangeModal = () => {
    setTempSelectedGradeForChange(config.gradeMode === 'normal' ? config.currentGrade : demonomerGrade);
    setIsGradeChangeModalOpen(true);
  };

  const handleConfirmGradeChange = () => {
    setDemonomerGrade(tempSelectedGradeForChange);
    handleConfigChange('gradeMode', 'gradeChange');
    setIsGradeChangeModalOpen(false);
  };

  // --- FIE2002 Hourly Trend State & Persistence ---
  const [isFie2002TrendOpen, setIsFie2002TrendOpen] = useState(false);
  const [fie2002TrendHistory, setFie2002TrendHistory] = useState<Fie2002TrendEntry[]>(() => {
    try {
      const saved = localStorage.getItem('fie2002_trend_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to read fie2002_trend_history from localStorage", e);
    }
    return generateDefaultFie2002History(125);
  });

  const updateFie2002TrendEntry = useCallback((val: number) => {
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const fullTimeString = `${dateStr} ${timeStr}`;
    const minuteKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setFie2002TrendHistory(prev => {
      let updated = [...prev];
      const sevenDaysAgoMs = now.getTime() - (7 * 24 * 3600 * 1000);
      // Prune data older than 7 days
      updated = updated.filter(entry => entry.timestamp >= sevenDaysAgoMs);

      if (updated.length === 0) {
        updated = generateDefaultFie2002History(val);
      }
      
      const lastIdx = updated.length - 1;
      // If recorded within the exact same minute key, update value in place
      if (lastIdx >= 0 && updated[lastIdx].hourKey === minuteKey) {
        updated[lastIdx] = {
          ...updated[lastIdx],
          value: val,
          timestamp: now.getTime(),
          timeString: fullTimeString,
          note: 'Live update per menit'
        };
      } else {
        updated.push({
          id: `fie_live_${now.getTime()}`,
          timestamp: now.getTime(),
          timeString: fullTimeString,
          hourKey: minuteKey,
          value: val,
          note: 'Live log per menit'
        });
      }

      // Limit max array size to 10000 points (~7 days of minute sampling)
      if (updated.length > 10000) {
        updated = updated.slice(updated.length - 10000);
      }

      try {
        localStorage.setItem('fie2002_trend_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  // Automatic interval to record live FIE2002 trend every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (demonomerData?.f2002 !== undefined && demonomerData?.f2002 !== null) {
        updateFie2002TrendEntry(demonomerData.f2002);
      }
    }, 60000); // 1 minute interval
    return () => clearInterval(interval);
  }, [demonomerData?.f2002, updateFie2002TrendEntry]);

  const handleAddManualFieTrend = (val: number, customHour?: string) => {
    const now = new Date();
    const hourStr = customHour || `${now.getHours().toString().padStart(2, '0')}:00`;
    const hourKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${hourStr}`;
    
    const newEntry: Fie2002TrendEntry = {
      id: `fie_manual_${now.getTime()}`,
      timestamp: now.getTime(),
      timeString: hourStr,
      hourKey: hourKey,
      value: val,
      note: 'Entry manual'
    };

    setFie2002TrendHistory(prev => {
      const updated = [...prev, newEntry];
      try {
        localStorage.setItem('fie2002_trend_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleResetDefaultFieTrend = () => {
    const defaultHist = generateDefaultFie2002History(demonomerData.f2002);
    setFie2002TrendHistory(defaultHist);
    try {
      localStorage.setItem('fie2002_trend_history', JSON.stringify(defaultHist));
    } catch (e) {}
  };

  const handleClearFieTrend = () => {
    setFie2002TrendHistory([]);
    try {
      localStorage.removeItem('fie2002_trend_history');
    } catch (e) {}
  };

  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [tempFormula, setTempFormula] = useState("");

  // --- Cycle Time State ---
  const [cycleTimeData, setCycleTimeData] = useState([
      { id: 1, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' },
      { id: 2, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' },
      { id: 3, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' },
      { id: 4, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' },
      { id: 5, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' }
  ]);

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
    skipReason: 'PASS' | 'CLEANING_ROBOT' | 'ABNORMAL_REAKSI' | 'MAINTENANCE';
    mode: 'OPEN' | 'CLOSE' | 'CLOSE TO OPEN';
    grade: GradeType;
    shiftSubsequent: boolean;
    delayHours: number;
    delayMinutes: number;
    manualDelayMinutes: number;
    stageInfo: string;
    hasCustomInterval: boolean;
    customIntervalHours: number;
    customIntervalMinutes: number;
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
    stageInfo: '',
    hasCustomInterval: false,
    customIntervalHours: 1,
    customIntervalMinutes: 30
  });

  const [config, setConfig] = useState<AppState>({
    baseBatchNumber: 5164,
    baseStartTime: new Date().toISOString(),
    intervalHours: 1,
    intervalMinutes: 30,
    columnsToDisplay: 4,
    itemConfigs: {},
    audioEnabled: true,
    currentGrade: 'SM',
    isStopped: false,
    reactorNotes: {},
    alertThresholdSeconds: 60,
    runningText: "JIKA DELAY DIATAS 15 MENIT WAJIB ADJUST SCHEDULE!",
    isMarqueePaused: false,
    marqueeSpeed: 30, // Default 30s
    theme: 'light',
    alarmSound: 'siren',
    alertStyle: 'classic',
    tableRowHeight: 40, 
    tableFontSize: 16,
    batchDurationMinutes: 120,
    hiddenReactors: [],
    hiddenFields: [],
    gradeMode: 'normal'
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Default closed to look cleaner on load
  const [isAlertStyleSectionOpen, setIsAlertStyleSectionOpen] = useState(false); // Default closed as requested by user
  const [testAlertStyle, setTestAlertStyle] = useState<AlertStyleType | null>(null);
  const announcedBatches = useRef<Set<string>>(new Set());
  const [audioAllowed, setAudioAllowed] = useState(false); // Track if audio is allowed
  const [audioNotification, setAudioNotification] = useState<{
    show: boolean;
    message: string;
    subMessage?: string;
    type?: 'info' | 'success' | 'warning';
  } | null>(null);

  /* Toast selalu hilang sendiri setelah 5 detik, lewat jalur pemicu mana pun.
     Sebelumnya tiap pemanggil memasang timer sendiri dengan durasi berbeda. */
  useEffect(() => {
    if (!audioNotification?.show) return;
    const timer = setTimeout(() => {
      setAudioNotification(prev => (prev ? { ...prev, show: false } : null));
    }, 5000);
    return () => clearTimeout(timer);
  }, [audioNotification?.show, audioNotification?.message]);
  const [dbSchemaError, setDbSchemaError] = useState<string | null>(null);
  const supabaseColumnsRef = useRef<Set<string>>(new Set());
  const isCatalystModalOpenRef = useRef(false);
  const isDemonomerPopupOpenRef = useRef(false);

  // Store active alarm sound in ref to avoid stale closures during first interaction
  const alarmSoundRef = useRef(config.alarmSound);
  useEffect(() => {
      alarmSoundRef.current = config.alarmSound;
  }, [config.alarmSound]);

  // Track load timestamp to prevent alarm sound from firing on initial website load / refresh
  const appMountedTimestampRef = useRef<number>(Date.now());
  const hasInitializedAudioNoticeRef = useRef(false);
  const initialGracePeriodOverRef = useRef(false);

  // When app finishes loading: initialize audio context silently & request desktop notification permission (No sound on initial load/refresh)
  useEffect(() => {
    if (!isLoading) {
        initAudioContext();
        setAudioAllowed(true);

        if (!hasInitializedAudioNoticeRef.current) {
            hasInitializedAudioNoticeRef.current = true;
            appMountedTimestampRef.current = Date.now();
            
            // Set a timer to end the initial grace period (no sounds during this time)
            setTimeout(() => {
                initialGracePeriodOverRef.current = true;
            }, 8000);

            // Show non-intrusive confirmation toast on load / refresh
            setAudioNotification({
                show: true,
                message: "Suara Alarm Diaktifkan",
                subMessage: `Audio alarm (${config.alarmSound.toUpperCase()}) siap berbunyi otomatis saat jadwal reaktor start.`,
                type: 'success'
            });

            // Request browser Notification permission for background tab / minimize alerts
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'default') {
                    Notification.requestPermission().catch(() => {});
                }
            }

        }
    }
  }, [isLoading, config.alarmSound]);

  useEffect(() => {
    isCatalystModalOpenRef.current = isCatalystModalOpen;
  }, [isCatalystModalOpen]);

  useEffect(() => {
    isDemonomerPopupOpenRef.current = isDemonomerPopupOpen;
  }, [isDemonomerPopupOpen]);

  const lastCycleTimeUpdateRef = useRef<number>(0);

  // --- Auto-scroll Reaktor Cycle Timeline to LIVE (NOW) position ---
  const cycleTimelineContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolledTimelineRef = useRef(false);

  const activeDemonomerGrade = config.gradeMode === 'normal' ? config.currentGrade : demonomerGrade;

  // --- Auto-close Settings Panel Logic (2 Minutes Countdown) ---
  const [settingsCountdown, setSettingsCountdown] = useState(120);

  useEffect(() => {
    if (!isSettingsOpen) {
      setSettingsCountdown(120);
      setIsAlertStyleSectionOpen(false);
      return;
    }

    setSettingsCountdown(120);
    const interval = setInterval(() => {
      setSettingsCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsSettingsOpen(false);
          setIsAlertStyleSectionOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSettingsOpen]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Auto-hide Settings Button Logic ---
  const [isSettingsButtonVisible, setIsSettingsButtonVisible] = useState(true);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivityTimer = useCallback(() => {
    setIsSettingsButtonVisible(true);
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    
    // Only start timer if settings panel is NOT open
    if (!isSettingsOpen) {
        activityTimerRef.current = setTimeout(() => {
            setIsSettingsButtonVisible(false);
        }, 30000); // 30 seconds
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    const handleFirstInteraction = () => {
        if (!audioAllowed) {
            enableAudio();
        }
        window.removeEventListener('mousedown', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('mousedown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [audioAllowed]);

  useEffect(() => {
    window.addEventListener('mousemove', resetActivityTimer);
    window.addEventListener('mousedown', resetActivityTimer);
    window.addEventListener('keydown', resetActivityTimer);
    window.addEventListener('touchstart', resetActivityTimer);

    resetActivityTimer();

    return () => {
      window.removeEventListener('mousemove', resetActivityTimer);
      window.removeEventListener('mousedown', resetActivityTimer);
      window.removeEventListener('keydown', resetActivityTimer);
      window.removeEventListener('touchstart', resetActivityTimer);
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    };
  }, [resetActivityTimer]);

  // Temp State for Settings Inputs
  const [tempBaseBatchNumber, setTempBaseBatchNumber] = useState(config.baseBatchNumber);
  const [tempBaseStartTime, setTempBaseStartTime] = useState(config.baseStartTime);
  const [tempAlarmSound, setTempAlarmSound] = useState<AlarmSoundType>(config.alarmSound);

  // Sync temp state with config when config loads/changes
  useEffect(() => {
    setTempBaseBatchNumber(config.baseBatchNumber);
    setTempBaseStartTime(config.baseStartTime);
    setTempAlarmSound(config.alarmSound);
  }, [config.baseBatchNumber, config.baseStartTime, config.alarmSound]);

  // --- Effects ---
  
  // Request Notification Permission
  useEffect(() => {
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission();
      }
  }, []);

  // --- Firebase Duplication Helpers (DISABLED) ---
  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    console.error('Firestore Error: ', error);
  };

  const syncAppSettingsToFirebase = async (updates: Partial<any>) => {};
  const syncReactorNoteToFirebase = async (reactorId: string, note: string) => {};
  const syncOverrideToFirebase = async (id: string, overrideData: any) => {};
  const deleteOverrideFromFirebase = async (id: string) => {};
  const clearAllOverridesFromFirebase = async () => {};

  // --- Supabase Data Loading ---
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    let settingsData: any = null;
    let notesData: any = null;
    let overridesData: any = null;

    try {
      // 1. Fetch Global Settings
      const { data: sData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      settingsData = sData;
      if (sData) {
        const columns = Object.keys(sData);
        supabaseColumnsRef.current = new Set(columns);
        
        // Check for missing columns in Supabase app_settings table
        const missing: string[] = [];
        if (!columns.includes('alarm_sound')) missing.push('alarm_sound');
        if (!columns.includes('alert_style')) missing.push('alert_style');
        if (!columns.includes('grade_mode')) missing.push('grade_mode');
        if (!columns.includes('cycle_time_data')) missing.push('cycle_time_data');
        
        if (missing.length > 0) {
          setDbSchemaError(`Missing database column(s): ${missing.join(', ')}`);
        } else {
          setDbSchemaError(null);
        }
      }

      // 2. Fetch Reactor Notes
      const { data: nData, error: notesError } = await supabase
        .from('reactor_notes')
        .select('*');
      
      if (notesError) throw notesError;
      notesData = nData;

      // 3. Fetch Schedule Overrides (Item Configs)
      const { data: oData, error: overridesError } = await supabase
        .from('schedule_overrides')
        .select('*');

      if (overridesError) throw overridesError;
      overridesData = oData;

    } catch (error) {
      console.warn("Failed to load data from Supabase:", error);
    }

    try {
      const notesMap: Record<string, string> = {};
      if (notesData) {
          notesData.forEach((row: any) => {
              notesMap[row.reactor_id] = row.note;
          });
      }

      const itemConfigsMap: Record<string, ItemConfig> = {};
      if (overridesData) {
          overridesData.forEach((row: any) => {
              itemConfigsMap[row.id] = {
                  overrideTime: row.override_time,
                  isSkipped: row.is_skipped,
                  skipReason: row.skip_reason || 'PASS',
                  mode: row.mode,
                  grade: row.grade,
                  note: row.note,
                  shiftSubsequent: row.shift_subsequent,
                  manualDelayMinutes: row.manual_delay_minutes,
                  stageInfo: row.stage_info || '',
                  customIntervalHours: ('custom_interval_hours' in row && row.custom_interval_hours !== null && row.custom_interval_hours !== undefined) ? Number(row.custom_interval_hours) : undefined,
                  customIntervalMinutes: ('custom_interval_minutes' in row && row.custom_interval_minutes !== null && row.custom_interval_minutes !== undefined) ? Number(row.custom_interval_minutes) : undefined
              };
          });
      }

      // Apply to State
      if (settingsData) {
          const isStoppedDb = Boolean(settingsData.is_stopped);
          const stoppedAtDb = settingsData.stopped_at_time ? Number(settingsData.stopped_at_time) : null;

          if (isStoppedDb) {
              let freezeTs = stoppedAtDb || stoppedAt;
              if (!freezeTs) {
                  const savedLs = localStorage.getItem('app_stopped_at');
                  if (savedLs && !isNaN(Number(savedLs))) {
                      freezeTs = Number(savedLs);
                  }
              }
              if (!freezeTs) {
                  freezeTs = Date.now();
              }
              setStoppedAt(freezeTs);
              localStorage.setItem('app_stopped_at', String(freezeTs));
              localStorage.setItem('app_is_stopped', 'true');
              setNow(new Date(freezeTs));
          } else {
              setStoppedAt(null);
              localStorage.removeItem('app_stopped_at');
              localStorage.setItem('app_is_stopped', 'false');
          }

          setConfig({
              baseBatchNumber: settingsData.base_batch_number,
              baseStartTime: settingsData.base_start_time,
              intervalHours: settingsData.interval_hours,
              intervalMinutes: settingsData.interval_minutes,
              columnsToDisplay: settingsData.columns_to_display,
              audioEnabled: true, // Auto-enable audio as requested
              currentGrade: settingsData.current_grade as GradeType,
              isStopped: settingsData.is_stopped,
              alertThresholdSeconds: settingsData.alert_threshold_seconds,
              runningText: settingsData.running_text,
              isMarqueePaused: settingsData.is_marquee_paused,
              marqueeSpeed: settingsData.marquee_speed || 30,
              theme: (settingsData.theme as 'light' | 'dark') || 'light',
              alarmSound: (settingsData.alarm_sound as AlarmSoundType) || 'siren',
              alertStyle: (settingsData.alert_style as AlertStyleType) || 'classic',
              reactorNotes: notesMap,
              itemConfigs: itemConfigsMap,
              tableRowHeight: settingsData.table_row_height || 76,
              tableFontSize: settingsData.table_font_size || 24,
              batchDurationMinutes: settingsData.batch_duration_minutes || 120,
              hiddenReactors: settingsData.hidden_reactors || [],
              hiddenFields: settingsData.hidden_fields || [],
              gradeMode: settingsData.grade_mode || 'normal'
          });

          // Load Zoom Level
          if (settingsData.zoom_level) {
              setZoomLevel(settingsData.zoom_level);
          }

          const activeEl = document.activeElement;
          const isFocusedOnInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

          // Load Catalyst Data
          if (settingsData.catalyst_data) {
              const loadedCatalyst = settingsData.catalyst_data;
              const mergedPresets = {
                  SM: { F: '16,3', H: '25,7' },
                  SLP: { F: '', H: '' },
                  SLK: { F: '', H: '' },
                  SE: { F: '', G: '' },
                  SR: { F: '', G: '' },
                  ...(loadedCatalyst.presets || {})
              };
              const updatedCatalyst = {
                  ...loadedCatalyst,
                  presets: mergedPresets
              };

              const isEditingCatalyst = isCatalystModalOpenRef.current || 
                  (isFocusedOnInput && (activeEl.closest('.catalyst-widget-container') || activeEl.closest('.catalyst-modal-container')));

              if (!isEditingCatalyst) {
                  setCatalystData(updatedCatalyst);
                  setTempCatalystPresets(mergedPresets);
              }
          }

          // Load Silo State
          if (settingsData.silo_state) {
              const isEditingSilo = isFocusedOnInput && activeEl.closest('.silo-container');
              if (!isEditingSilo) {
                  setSiloState(settingsData.silo_state);
              }
          }

          // Load Demonomer Data
          if (settingsData.demonomer_data) {
              const isEditingDemonomer = isDemonomerPopupOpenRef.current || 
                  (isFocusedOnInput && activeEl.closest('.demonomer-widget-container'));
              if (!isEditingDemonomer) {
                  setDemonomerData(settingsData.demonomer_data);
              }
          }

          // Load Cycle Time Data
          if (settingsData.cycle_time_data) {
              const isEditingCycleTime = isFocusedOnInput && activeEl.closest('.cycle-time-container');
              const wasRecentlyUpdatedLocally = (Date.now() - lastCycleTimeUpdateRef.current) < 4000;
              if (!isEditingCycleTime && !wasRecentlyUpdatedLocally) {
                  const dbRows = settingsData.cycle_time_data || [];
                  const normalizedRows = Array.from({ length: 5 }, (_, idx) => {
                      const existing = dbRows[idx];
                      return existing ? { ...existing, id: idx + 1 } : { id: idx + 1, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' };
                  });
                  setCycleTimeData(normalizedRows);
              }
          }

          // Load Grade Mode
          if (settingsData && 'grade_mode' in settingsData && settingsData.grade_mode) {
              setConfig(prev => ({ ...prev, gradeMode: settingsData.grade_mode as 'normal' | 'gradeChange' }));
          }

      } else {
           // Init defaults if no settings exist (both databases)
           try {
               await supabase.from('app_settings').insert([{ id: 1 }]);
           } catch (err) {
               console.warn("Could not insert initial row to Supabase:", err);
           }
           
           const initialSettings = {
               id: 1,
               base_batch_number: 5164,
               base_start_time: new Date().toISOString(),
               interval_hours: 1,
               interval_minutes: 30,
               columns_to_display: 4,
               audio_enabled: false,
               current_grade: 'SM',
               is_stopped: false,
               alert_threshold_seconds: 60,
               running_text: 'JIKA DELAY DIATAS 15 MENIT WAJIB ADJUST SCHEDULE!',
               is_marquee_paused: false,
               marquee_speed: 30,
               theme: 'light',
               alarm_sound: 'siren',
               table_row_height: 95,
               table_font_size: 26,
               batch_duration_minutes: 120,
               hidden_reactors: [],
               hidden_fields: [],
               grade_mode: 'normal'
           };
           await syncAppSettingsToFirebase(initialSettings);
      }
    } catch (err) {
      console.error("Error setting configuration states:", err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Auto-refresh polling (every 5 seconds)
    const interval = setInterval(() => {
        loadData(false); // don't show loading spinner on background refresh
    }, 5000);
    
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config.theme]);

  // --- Real-time / Periodic Saver Helpers ---
  
  // Save specific global setting to DB
  const updateGlobalSetting = async (updates: Partial<any>) => {
      // Optimistic update
      try {
          // Sync to Firebase
          await syncAppSettingsToFirebase(updates);

          // Filter updates to only send columns known to exist in Supabase's app_settings table
          const supabaseUpdates: any = {};
          let hasSupabaseUpdates = false;

          Object.keys(updates).forEach(key => {
              if (supabaseColumnsRef.current.size === 0 || supabaseColumnsRef.current.has(key)) {
                  supabaseUpdates[key] = updates[key];
                  hasSupabaseUpdates = true;
              }
          });

          if (hasSupabaseUpdates) {
              const { error } = await supabase
                  .from('app_settings')
                  .update(supabaseUpdates)
                  .eq('id', 1);
              
              if (error) {
                  // Specifically handle missing column error (PGRST204)
                  if (error.code === 'PGRST204') {
                      if (error.message.includes('grade_mode')) {
                          console.warn("Database column 'grade_mode' is missing. Saved locally and to Firebase fallback.");
                      } else if (error.message.includes('alarm_sound')) {
                          console.warn("Database column 'alarm_sound' is missing. Saved locally and to Firebase fallback.");
                      } else if (error.message.includes('alert_style')) {
                          console.warn("Database column 'alert_style' is missing. Saved locally and to Firebase fallback.");
                      }
                      return;
                  }
                  console.error("Failed to update settings in Supabase:", error);
              }
          }
      } catch (err) {
          console.error("Unexpected error updating settings:", err);
      }
  };

  // --- Dynamic Calculation Logic (Shared with Demonomer) ---
  const evaluateMath = (expression: string, vars: Record<string, number>): number => {
    let expr = expression;
    const sortedKeys = Object.keys(vars).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'g');
        expr = expr.replace(regex, String(vars[key]));
    }

    try {
        const cleanExpr = expr.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '');
        if (!cleanExpr.trim()) return 0;
        const result = new Function('return ' + expr)();
        return isFinite(result) ? result : 0;
    } catch (e) {
        return 0;
    }
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
        alarmSound: 'alarm_sound',
        alertStyle: 'alert_style',
        tableRowHeight: 'table_row_height',
        tableFontSize: 'table_font_size',
        batchDurationMinutes: 'batch_duration_minutes',
        gradeMode: 'grade_mode'
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

  // Update "now" every second using Web Worker to prevent background throttling
  useEffect(() => {
    if (config.isStopped) {
      if (stoppedAt) {
        setNow(new Date(stoppedAt));
      } else {
        const freezeTs = Date.now();
        setStoppedAt(freezeTs);
        localStorage.setItem('app_stopped_at', String(freezeTs));
        localStorage.setItem('app_is_stopped', 'true');
        setNow(new Date(freezeTs));
      }
      return;
    }

    const workerCode = `
      let timer;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          timer = setInterval(() => {
            self.postMessage('tick');
          }, 1000);
        } else if (e.data === 'stop') {
          clearInterval(timer);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      if (e.data === 'tick') {
        setNow(new Date());
      }
    };

    worker.postMessage('start');

    return () => {
      worker.postMessage('stop');
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, [config.isStopped, stoppedAt]);

  const handleApply = async () => {
      try {
          const newStartTime = new Date(tempBaseStartTime).toISOString();
          
          // Sync to Firebase
          await syncAppSettingsToFirebase({
              base_batch_number: tempBaseBatchNumber,
              base_start_time: newStartTime,
          });
          await clearAllOverridesFromFirebase();
          
          // Update Supabase
          await supabase.from('app_settings').update({
              base_batch_number: tempBaseBatchNumber,
              base_start_time: newStartTime,
          }).eq('id', 1);

          // Clear overrides to ensure a fresh cycle
          await supabase.from('schedule_overrides').delete().neq('id', 'placeholder');

          // Update Local State
          setConfig(prev => ({
              ...prev,
              baseBatchNumber: tempBaseBatchNumber,
              baseStartTime: newStartTime,
              itemConfigs: {} // Clear overrides
          }));
          
          setDismissedAlerts(new Set());
          console.log("Settings Applied and Sequence Reset successfully");
      } catch (error) {
          console.error("Error applying settings:", error);
          setDbSchemaError("Failed to apply settings. Check console.");
      }
  };

  const toggleAudio = () => {
    handleConfigChange('audioEnabled', !config.audioEnabled);
  };
  
  const toggleStop = () => {
    const nextIsStopped = !config.isStopped;
    if (nextIsStopped) {
      const freezeTs = Date.now();
      setStoppedAt(freezeTs);
      localStorage.setItem('app_stopped_at', String(freezeTs));
      localStorage.setItem('app_is_stopped', 'true');
      setNow(new Date(freezeTs));

      handleConfigChange('isStopped', true);
      updateGlobalSetting({ is_stopped: true, stopped_at_time: freezeTs });
    } else {
      setStoppedAt(null);
      localStorage.removeItem('app_stopped_at');
      localStorage.setItem('app_is_stopped', 'false');

      const freshNow = new Date();
      setNow(freshNow);

      handleConfigChange('isStopped', false);
      updateGlobalSetting({ is_stopped: false, stopped_at_time: null });
    }
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

  const getLocalIsoString = (date: Date) => {
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localTime = new Date(date.getTime() - tzOffset);
      return localTime.toISOString().slice(0, 16);
  };

  const adjustResetParamsTime = (minutes: number) => {
      try {
          const currentDate = resetParams.time ? new Date(resetParams.time) : new Date();
          if (isNaN(currentDate.getTime())) {
              const now = new Date();
              const adjusted = new Date(now.getTime() + minutes * 60000);
              setResetParams(prev => ({ ...prev, time: getLocalIsoString(adjusted) }));
          } else {
              const adjusted = new Date(currentDate.getTime() + minutes * 60000);
              setResetParams(prev => ({ ...prev, time: getLocalIsoString(adjusted) }));
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleResetSequence = (item?: ScheduleItem) => {
      let batchVal = config.baseBatchNumber;
      let localIso = '';

      if (item && item.startTime) {
          batchVal = item.batchNumber || config.baseBatchNumber;
          localIso = getLocalIsoString(item.startTime);
      } else {
          const n = new Date();
          const coeff = 1000 * 60 * 5;
          const rounded = new Date(Math.round(n.getTime() / coeff) * coeff);
          localIso = getLocalIsoString(rounded);
      }
      
      setResetParams({
          batch: batchVal,
          time: localIso
      });
      setIsResetModalOpen(true);
  };

  const submitResetSequence = async () => {
      try {
          if (!resetParams.time) {
              setDbSchemaError("Silakan isi Waktu Mulai (New Start Time) yang valid.");
              return;
          }
          const parsedDate = new Date(resetParams.time);
          if (isNaN(parsedDate.getTime())) {
              setDbSchemaError("Format Waktu Mulai tidak valid.");
              return;
          }
          const newStartTime = parsedDate.toISOString();
          
          // Sync to Firebase
          await syncAppSettingsToFirebase({
              base_batch_number: resetParams.batch,
              base_start_time: newStartTime,
          });
          await clearAllOverridesFromFirebase();
          
          // Update Supabase
          const { error } = await supabase.from('app_settings').update({
              base_batch_number: resetParams.batch,
              base_start_time: newStartTime,
          }).eq('id', 1);

          if (error) throw error;

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
          setSelectedItem(null);
      } catch (error) {
          console.error("Error resetting sequence:", error);
          setDbSchemaError("Gagal mereset sequence. Silakan periksa koneksi atau console.");
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

  const openCatalystModal = () => {
      if (catalystData.presets) {
          setTempCatalystPresets(prev => ({
              ...prev,
              ...catalystData.presets
          }));
      }
      setIsCatalystModalOpen(true);
  };

  const handleTempPresetChange = (grade: string, catKey: string, val: string) => {
      setTempCatalystPresets(prev => ({
          ...prev,
          [grade]: {
              ...prev[grade],
              [catKey]: val
          }
      }));
  };

  const saveCatalystPresets = () => {
      const updatedCatalystData = {
          ...catalystData,
          presets: tempCatalystPresets
      };
      setCatalystData(updatedCatalystData);
      updateGlobalSetting({ catalyst_data: updatedCatalystData });
      setIsCatalystModalOpen(false);
  };

  const applyCatalystPreset = (grade: string) => {
      const preset = tempCatalystPresets[grade];
      if (!preset) return;

      const newCata = {
          ...catalystData,
          f: { ...catalystData.f, netto: preset.F || '' },
          h: { ...catalystData.h, netto: preset.H || '' },
          g: { ...catalystData.g, netto: preset.G || '' }
      };

      setCatalystData(newCata);
      updateGlobalSetting({ catalyst_data: newCata });
      setIsCatalystModalOpen(false);
  };

  // --- Cycle Time Logic ---
  const calculateDuration = (start: string, end: string) => {
      if (!start || !end) return '';
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      
      let startTotal = startH * 60 + startM;
      let endTotal = endH * 60 + endM;
      
      if (endTotal < startTotal) {
          endTotal += 24 * 60; // Handle cross midnight
      }
      
      const diff = endTotal - startTotal;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const calculateBlowingHold = (readyBlowing: string, blowing: string) => {
      // =(BLOWING - READY BLOWING)
      if (!readyBlowing || !blowing) return '';
      const duration = calculateDuration(readyBlowing, blowing);
      if (!duration) return '';
      const [h, m] = duration.split(':').map(Number);
      const totalMins = (h * 60) + m; // Removed +1 based on request
      return `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;
  };

  const handleCycleTimeChange = (id: number, field: string, value: string) => {
      lastCycleTimeUpdateRef.current = Date.now();
      const newData = cycleTimeData.map(row => row.id === id ? { ...row, [field]: value } : row);
      setCycleTimeData(newData);
      updateGlobalSetting({ cycle_time_data: newData });
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

      if (field === 'f2002') {
          const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
          updateFie2002TrendEntry(numVal);
      }
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

          // Sync to Firebase
          await syncReactorNoteToFirebase(editingReactorNote, tempReactorNote);

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
    setShouldBlinkNote(true);
    setTimeout(() => setShouldBlinkNote(false), 5000);
    
    // Determine current config or defaults
    const itemConfig = config.itemConfigs[item.id] || {};
    
    // Calculate local ISO string for input
    const localIso = new Date(item.startTime.getTime() - (item.startTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    // If Reaktor S Cycle 1, sync resetParams for INPUT FOR RE-S
    if (item.reactorId === 'S' && item.cycleIndex === 0) {
      setResetParams({
        batch: item.batchNumber || config.baseBatchNumber,
        time: localIso
      });
    }

    setEditForm({
      timeValue: localIso,
      note: itemConfig.note || '',
      isSkipped: itemConfig.isSkipped || false,
      skipReason: itemConfig.skipReason || 'PASS',
      mode: itemConfig.mode || 'CLOSE',
      grade: itemConfig.grade || item.grade, 
      shiftSubsequent: itemConfig.shiftSubsequent || false,
      delayHours: 0,
      delayMinutes: 0,
      manualDelayMinutes: itemConfig.manualDelayMinutes || 0,
      stageInfo: itemConfig.stageInfo || '',
      hasCustomInterval: itemConfig.customIntervalHours !== undefined,
      customIntervalHours: itemConfig.customIntervalHours !== undefined ? itemConfig.customIntervalHours : config.intervalHours,
      customIntervalMinutes: itemConfig.customIntervalMinutes !== undefined ? itemConfig.customIntervalMinutes : config.intervalMinutes,
    });
  };

  const closeRescheduleModal = () => {
    setSelectedItem(null);
  };

  const handleModeChange = (newMode: 'OPEN' | 'CLOSE' | 'CLOSE TO OPEN') => {
    if (newMode === editForm.mode) return;
    const currentDate = new Date(editForm.timeValue);
    let newDate = new Date(currentDate);

    if (newMode === 'OPEN') {
      // If switching from CLOSE or CLOSE TO OPEN to OPEN, subtract 30 mins
      if (editForm.mode === 'CLOSE' || editForm.mode === 'CLOSE TO OPEN') {
        newDate = addMinutes(newDate, -30);
      }
    } else if (newMode === 'CLOSE' || newMode === 'CLOSE TO OPEN') {
      // If switching from OPEN to CLOSE or CLOSE TO OPEN, add 30 mins
      if (editForm.mode === 'OPEN') {
        newDate = addMinutes(newDate, 30);
      }
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
        skipReason: editForm.skipReason,
        mode: editForm.mode,
        grade: editForm.grade !== config.currentGrade ? editForm.grade : undefined,
        shiftSubsequent: editForm.shiftSubsequent,
        manualDelayMinutes: editForm.manualDelayMinutes,
        stageInfo: editForm.stageInfo
      };

      const newConfigs = { ...config.itemConfigs };
      const dbUpserts: any[] = [];

      if (editForm.hasCustomInterval) {
        // Find already started items in scheduleMatrix (status === 'past' || status === 'active')
        const allItems = Object.values(scheduleMatrix).flat() as ScheduleItem[];
        const alreadyStartedItems = allItems.filter(item => 
          (item.status === 'past' || item.status === 'active') && 
          item.id !== selectedItem.id
        );

        for (const item of alreadyStartedItems) {
          const existingConfig = config.itemConfigs[item.id];
          const hasTimeOverride = !!existingConfig?.overrideTime;

          const frozenConfig: ItemConfig = {
            overrideTime: hasTimeOverride ? existingConfig.overrideTime : item.startTime.toISOString(),
            note: existingConfig?.note || '',
            isSkipped: existingConfig?.isSkipped || false,
            skipReason: existingConfig?.skipReason || 'PASS',
            mode: existingConfig?.mode || 'CLOSE',
            grade: existingConfig?.grade,
            shiftSubsequent: true,
            manualDelayMinutes: existingConfig?.manualDelayMinutes || 0,
            stageInfo: existingConfig?.stageInfo || ''
          };

          newConfigs[item.id] = frozenConfig;
          dbUpserts.push({
            id: item.id,
            override_time: frozenConfig.overrideTime,
            is_skipped: frozenConfig.isSkipped,
            skip_reason: frozenConfig.skipReason,
            mode: frozenConfig.mode,
            grade: frozenConfig.grade,
            note: frozenConfig.note,
            shift_subsequent: frozenConfig.shiftSubsequent,
            manual_delay_minutes: frozenConfig.manualDelayMinutes,
            stage_info: frozenConfig.stageInfo,
            updated_at: new Date()
          });
        }

        // Also update the global settings in database
        await updateGlobalSetting({
          interval_hours: editForm.customIntervalHours,
          interval_minutes: editForm.customIntervalMinutes
        });
      }

      // Optimistic Update
      setConfig(prev => ({
        ...prev,
        intervalHours: editForm.hasCustomInterval ? editForm.customIntervalHours : prev.intervalHours,
        intervalMinutes: editForm.hasCustomInterval ? editForm.customIntervalMinutes : prev.intervalMinutes,
        itemConfigs: {
          ...prev.itemConfigs,
          ...newConfigs,
          [selectedItem.id]: newConfig
        }
      }));

      // Sync to Firebase (main item)
      await syncOverrideToFirebase(selectedItem.id, {
          override_time: newConfig.overrideTime,
          is_skipped: newConfig.isSkipped,
          skip_reason: newConfig.skipReason,
          mode: newConfig.mode,
          grade: newConfig.grade,
          note: newConfig.note,
          shift_subsequent: newConfig.shiftSubsequent,
          manual_delay_minutes: newConfig.manualDelayMinutes,
          stage_info: newConfig.stageInfo
      });

      const selectedItemUpsert = {
          id: selectedItem.id,
          override_time: newConfig.overrideTime,
          is_skipped: newConfig.isSkipped,
          skip_reason: newConfig.skipReason,
          mode: newConfig.mode,
          grade: newConfig.grade,
          note: newConfig.note,
          shift_subsequent: newConfig.shiftSubsequent,
          manual_delay_minutes: newConfig.manualDelayMinutes,
          stage_info: newConfig.stageInfo,
          updated_at: new Date()
      };

      const allUpserts = [...dbUpserts, selectedItemUpsert];

      // DB Upsert
      const { error } = await supabase
          .from('schedule_overrides')
          .upsert(allUpserts);

      if (error) {
          console.error("Error saving overrides:", error);
      }

      closeRescheduleModal();
    }
  };

  const clearOverride = async () => {
    if (selectedItem) {
      // Optimistic
      const newConfigs = { ...config.itemConfigs };
      delete newConfigs[selectedItem.id];
      setConfig(prev => ({ ...prev, itemConfigs: newConfigs }));

      // Sync to Firebase
      await deleteOverrideFromFirebase(selectedItem.id);

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
    let runningIntervalMinutes = totalIntervalMinutes;
    let lastAddedIntervalMinutes = totalIntervalMinutes;

    REACTORS.forEach(r => matrix[r.id] = []);

    for (let col = 0; col < config.columnsToDisplay; col++) {
      for (let rIndex = 0; rIndex < REACTORS.length; rIndex++) {
        const reactor = REACTORS[rIndex];
        const uniqueId = `${reactor.id}-${currentBatch}`;
        const itemConfig = config.itemConfigs[uniqueId];

        if (itemConfig?.customIntervalHours !== undefined && itemConfig?.customIntervalMinutes !== undefined) {
            const newInterval = (itemConfig.customIntervalHours * 60) + itemConfig.customIntervalMinutes;
            if (globalIndex > 0) {
                sequenceCursor = sequenceCursor - (lastAddedIntervalMinutes * 60000) + (newInterval * 60000);
            }
            runningIntervalMinutes = newInterval;
        }

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
            sequenceCursor += (runningIntervalMinutes * 60000);
            lastAddedIntervalMinutes = runningIntervalMinutes;
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
    const allItems = Object.values(scheduleMatrix).flat() as ScheduleItem[];
    if (allItems.length === 0) return false;
    return allItems.every(item => item.status === 'past' || item.status === 'skipped');
  }, [scheduleMatrix]);

  // --- Auto-scroll Reaktor Cycle Timeline to LIVE (NOW) position ---
  const scrollInactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isUserScrollingTimeline, setIsUserScrollingTimeline] = useState(false);

  const scrollToNowPosition = useCallback((smooth = true) => {
    if (!cycleTimelineContainerRef.current) return;
    const container = cycleTimelineContainerRef.current;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    if (scrollWidth <= clientWidth) return;

    // Calculate start time & slots total minutes same as renderConflictTimeline
    const allItems = (Object.values(scheduleMatrix).flat() as ScheduleItem[])
      .filter(item => item.status !== 'skipped');
    const timelineTimes = [now.getTime()];
    if (allItems.length > 0) {
      allItems.forEach(item => {
        timelineTimes.push(item.startTime.getTime());
        timelineTimes.push(item.startTime.getTime() + (config.batchDurationMinutes || 240) * 60000);
      });
    } else {
      timelineTimes.push(now.getTime() + 12 * 3600000);
    }
    const earliestTime = new Date(Math.min(...timelineTimes));
    const startTime = new Date(earliestTime);
    startTime.setMinutes(startTime.getMinutes() < 30 ? 0 : 30, 0, 0);

    const latestTime = new Date(Math.max(...timelineTimes));
    const totalMinutesNeeded = (latestTime.getTime() - startTime.getTime()) / 60000;
    const slotsCount = Math.max(24, Math.ceil(totalMinutesNeeded / 30));
    const totalMinutes = slotsCount * 30;

    const nowMinutes = (now.getTime() - startTime.getTime()) / 60000;
    const nowPosRatio = Math.max(0, Math.min(1, nowMinutes / totalMinutes));

    const nowPx = 80 + (scrollWidth - 80) * nowPosRatio;
    const targetScrollLeft = Math.max(0, nowPx - clientWidth / 2);

    container.scrollTo({
      left: targetScrollLeft,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, [now, scheduleMatrix, config.batchDurationMinutes]);

  const handleTimelineScroll = useCallback(() => {
    setIsUserScrollingTimeline(true);
    if (scrollInactivityTimerRef.current) {
      clearTimeout(scrollInactivityTimerRef.current);
    }
    scrollInactivityTimerRef.current = setTimeout(() => {
      setIsUserScrollingTimeline(false);
      scrollToNowPosition(true);
    }, 6000); // Auto-return to LIVE NOW position after 6s of inactivity
  }, [scrollToNowPosition]);

  useEffect(() => {
    if (currentView === 'scheduler') {
      const isFirst = !hasInitialScrolledTimelineRef.current;
      const timer = setTimeout(() => {
        scrollToNowPosition(!isFirst);
        hasInitialScrolledTimelineRef.current = true;
      }, 150);
      return () => clearTimeout(timer);
    } else {
      hasInitialScrolledTimelineRef.current = false;
    }
  }, [currentView, scrollToNowPosition]);

  /* Tabel scheduler saat layar sempit: kolom paling kiri berisi batch yang
     sudah lewat, sehingga jadwal yang akan start tertutup dan harus digeser
     manual. Saat halaman dibuka, geser otomatis ke kolom pertama yang belum
     start. Di layar lebar tabel tidak meluber, jadi ini otomatis tidak aktif. */
  const schedulerScrollRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledSchedulerRef = useRef(false);

  useEffect(() => {
    if (currentView !== 'scheduler') {
      hasAutoScrolledSchedulerRef.current = false;
      return;
    }
    if (hasAutoScrolledSchedulerRef.current) return;

    /* Ditunda: tabel baru punya ukuran setelah dirender. */
    const timer = setTimeout(() => {
      const el = schedulerScrollRef.current;
      if (!el) return;

      if (el.scrollWidth <= el.clientWidth + 1) {
        hasAutoScrolledSchedulerRef.current = true;
        return;
      }

      const rows = Object.values(scheduleMatrix) as ScheduleItem[][];
      const colCount = rows[0]?.length || 0;
      const nowMs = Date.now();

      /* Kolom pertama yang masih punya batch belum start di reaktor mana pun.
         Batch yang di-skip tidak dihitung karena memang tidak akan jalan. */
      let targetCol = -1;
      for (let j = 0; j < colCount && targetCol < 0; j++) {
        for (const row of rows) {
          const item = row[j];
          if (item && item.status !== 'skipped' && item.startTime.getTime() >= nowMs) {
            targetCol = j;
            break;
          }
        }
      }

      if (targetCol <= 0) {
        hasAutoScrolledSchedulerRef.current = true;
        return;
      }

      const firstRow = el.querySelector('tbody tr');
      const cell = firstRow?.children[targetCol + 1] as HTMLElement | undefined;
      const stickyCol = firstRow?.children[0] as HTMLElement | undefined;
      if (!cell || !stickyCol) return;

      /* Lebar kolom reaktor dikurangi karena kolom itu sticky dan akan
         menutupi kolom tujuan kalau tidak dikompensasi. */
      const cellLeft = cell.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
      el.scrollLeft = Math.max(0, cellLeft - stickyCol.getBoundingClientRect().width);
      hasAutoScrolledSchedulerRef.current = true;
    }, 250);

    return () => clearTimeout(timer);
  }, [currentView, scheduleMatrix]);

  // --- Auto-calculated Running Text for Polymer ---
  const autoRunningText = useMemo(() => {
    try {
      const baseDate = new Date(config.baseStartTime);
      const totalIntervalMinutes = (config.intervalHours * 60) + config.intervalMinutes;

      interface Theoretical {
        startTime: Date;
        isSkipped: boolean;
      }
      const list: Theoretical[] = [];

      // 1. Forward list
      let currentBatch = config.baseBatchNumber;
      let sequenceCursor = baseDate.getTime();
      let runningIntervalMinutes = totalIntervalMinutes;
      let lastAddedIntervalMinutes = totalIntervalMinutes;
      let globalIndex = 0;
      
      for (let col = 0; col < Math.max(24, config.columnsToDisplay); col++) {
        for (let rIndex = 0; rIndex < REACTORS.length; rIndex++) {
          const reactor = REACTORS[rIndex];
          const uniqueId = `${reactor.id}-${currentBatch}`;
          const itemConfig = config.itemConfigs[uniqueId];

          if (itemConfig?.customIntervalHours !== undefined && itemConfig?.customIntervalMinutes !== undefined) {
              const newInterval = (itemConfig.customIntervalHours * 60) + itemConfig.customIntervalMinutes;
              if (globalIndex > 0) {
                  sequenceCursor = sequenceCursor - (lastAddedIntervalMinutes * 60000) + (newInterval * 60000);
              }
              runningIntervalMinutes = newInterval;
          }

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

          const isSkipped = itemConfig?.isSkipped || false;

          list.push({
            startTime: effectiveTime,
            isSkipped
          });

          if (!isSkipped) {
              sequenceCursor += (runningIntervalMinutes * 60000);
              lastAddedIntervalMinutes = runningIntervalMinutes;
              currentBatch++;
          }

          globalIndex++;
        }
      }

      // 2. Backward list
      let prevBatch = config.baseBatchNumber - 1;
      let prevCursor = baseDate.getTime();
      let reactorIndex = REACTORS.length - 1; // start with W
      
      for (let i = 0; i < 100; i++) {
        const reactor = REACTORS[reactorIndex];
        const uniqueId = `${reactor.id}-${prevBatch}`;
        const itemConfig = config.itemConfigs[uniqueId];
        
        const isSkipped = itemConfig?.isSkipped || false;
        
        if (!isSkipped) {
          prevCursor -= (totalIntervalMinutes * 60000);
        }
        
        let effectiveTime = new Date(prevCursor);
        if (itemConfig?.overrideTime) {
          effectiveTime = new Date(itemConfig.overrideTime);
        }

        list.push({
          startTime: effectiveTime,
          isSkipped
        });

        prevBatch--;
        reactorIndex = (reactorIndex - 1 + REACTORS.length) % REACTORS.length;
      }

      // Sort chronological
      list.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Determine batch days for today and yesterday
      const todayBatchDate = getBatchDate(now);
      const prevBatchDate = new Date(todayBatchDate.getTime() - 24 * 60 * 60 * 1000);

      const todayBatchStr = formatDate(todayBatchDate);
      const prevBatchStr = formatDate(prevBatchDate);

      // Filter and count active (non-skipped) batches for both days
      const countToday = list.filter(b => !b.isSkipped && formatDate(getBatchDate(b.startTime)) === todayBatchStr).length;
      const countPrev = list.filter(b => !b.isSkipped && formatDate(getBatchDate(b.startTime)) === prevBatchStr).length;

      // Detect grade changes for today's batches
      const allScheduledItems = Object.values(scheduleMatrix).flat() as ScheduleItem[];
      const activeItems = allScheduledItems.filter(item => item.status !== 'skipped');
      activeItems.sort((a, b) => a.batchNumber - b.batchNumber);

      const gradeChanges: string[] = [];
      for(let i = 0; i < activeItems.length - 2; i++) {
         const oldGrade = activeItems[i].grade;
         const newGrade1 = activeItems[i+1].grade;
         const newGrade2 = activeItems[i+2].grade;

         if (oldGrade !== newGrade1 && newGrade1 === newGrade2) {
             const batchDateStr = formatDate(getBatchDate(activeItems[i+1].startTime));
             const msg = `pada tanggal ${batchDateStr} grade change ${oldGrade} ke ${newGrade1}`;
             if (!gradeChanges.includes(msg)) {
                 gradeChanges.push(msg);
             }
         }
      }
      
      const gradeChangesText = gradeChanges.length > 0 ? (
        <span className="text-rose-600 dark:text-rose-400 font-extrabold mr-3">
          {gradeChanges.join(" | ")} |
        </span>
      ) : null;

      return (
        <span className="flex items-center gap-1">
          {gradeChangesText}
          <span className="text-rose-600 dark:text-rose-400 font-extrabold ms-1">
            estimasi batch pada hari ini adalah <span className="text-blue-600 dark:text-blue-400 font-extrabold">{countToday} batch</span>
          </span>
          {config.runningText && (
            <>
              <span className="mx-3 text-slate-400 font-normal">|</span>
              <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                {config.runningText}
              </span>
            </>
          )}
        </span>
      );
    } catch (error) {
      console.error("Error in autoRunningText useMemo:", error);
      return (
        <span className="flex items-center gap-1">
          <span className="text-rose-600 dark:text-rose-400 font-extrabold ms-1">
            estimasi batch pada hari ini adalah <span className="text-blue-600 dark:text-blue-400 font-extrabold">0 batch</span>
          </span>
        </span>
      );
    }
  }, [config, now, scheduleMatrix]);

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

    // Don't play alarm sound in the first seconds of page load to prevent noisy refresh
    const isInitialGracePeriod = !initialGracePeriodOverRef.current;

    (Object.values(scheduleMatrix).flat() as ScheduleItem[]).forEach(item => {
        if (item.status === 'active') {
            if (!announcedBatches.current.has(item.id)) {
                announcedBatches.current.add(item.id);
                if (!isInitialGracePeriod) {
                    playAlarmSound(config.alarmSound);
                }
            }
            
            // Check if audio context is allowed
            const ctx = initAudioContext();
            if (ctx) {
                if (ctx.state === 'suspended') {
                    setAudioAllowed(false);
                } else {
                    setAudioAllowed(true);
                }
            }
        }
    });

    if (announcedBatches.current.size > 50) {
        announcedBatches.current.clear();
    }
  }, [scheduleMatrix, config.audioEnabled, config.isStopped]);

  // Handler to enable audio manually without loud blast
  const enableAudio = () => {
      const ctx = initAudioContext();
      if (ctx && ctx.state === 'suspended') {
          ctx.resume();
      }
      setAudioAllowed(true);
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
      }
      setAudioNotification({
          show: true,
          message: "Suara Alarm Diaktifkan",
          subMessage: "Sistem alarm suara aktif dan siap membunyikan peringatan jadwal reaktor.",
          type: 'success'
      });
  };

  // Full Screen Alert Logic
  const fullScreenAlertItem = useMemo(() => {
      if (config.isStopped || config.alertThresholdSeconds <= 0) return null;
      const allItems = Object.values(scheduleMatrix).flat() as ScheduleItem[];
      const impendingItem = allItems.find(item => {
          if (item.status === 'skipped' || item.status === 'past') return false;
          if (dismissedAlerts.has(item.id)) return false;
          const secondsUntilStart = (item.startTime.getTime() - now.getTime()) / 1000;
          return secondsUntilStart > 0 && secondsUntilStart <= config.alertThresholdSeconds;
      });
      return impendingItem || null;
  }, [scheduleMatrix, now, config.isStopped, config.alertThresholdSeconds, dismissedAlerts]);

  /* Start reaktor terdekat yang belum lewat, untuk countdown di header.
     scheduleMatrix dikelompokkan per reaktor, jadi hasil flat() tidak urut
     waktu — harus dipindai untuk cari yang paling awal, bukan diambil yang
     pertama ketemu. Pindai linear (bukan sort) karena `now` berubah tiap detik. */
  const nextStartItem = useMemo(() => {
      if (config.isStopped) return null;
      const allItems = Object.values(scheduleMatrix).flat() as ScheduleItem[];
      const nowMs = now.getTime();
      let soonest: ScheduleItem | null = null;
      for (const item of allItems) {
          if (item.status === 'skipped') continue;
          const t = item.startTime.getTime();
          if (t <= nowMs) continue;
          if (!soonest || t < soonest.startTime.getTime()) soonest = item;
      }
      return soonest;
  }, [scheduleMatrix, now, config.isStopped]);

  const nextStartSeconds = nextStartItem
      ? Math.max(0, Math.ceil((nextStartItem.startTime.getTime() - now.getTime()) / 1000))
      : null;

  const isNextStartImminent =
      nextStartSeconds !== null && nextStartSeconds <= (config.alertThresholdSeconds || 300);

  const nextStartReactor = nextStartItem
      ? REACTORS.find(r => r.id === nextStartItem.reactorId)
      : undefined;

  /* Ditampilkan sebagai menit penuh + detik (mis. 75 menit 15 detik), bukan
     jam:menit:detik — menit tidak di-wrap ke jam supaya jarak ke start
     langsung terbaca tanpa dihitung ulang. */
  const nextStartMinutes = nextStartSeconds !== null ? Math.floor(nextStartSeconds / 60) : null;
  const nextStartRemSeconds = nextStartSeconds !== null ? nextStartSeconds % 60 : null;

  // System Notification for Full Screen Alert
  const [lastAlertedId, setLastAlertedId] = useState<string | null>(null);

  useEffect(() => {
      if (fullScreenAlertItem && fullScreenAlertItem.id !== lastAlertedId) {
          setLastAlertedId(fullScreenAlertItem.id);
          
          // Don't play alarm sound in the first seconds of page load to prevent noisy refresh
          const isInitialGracePeriod = !initialGracePeriodOverRef.current;

          // Play Siren Sound
          if (config.audioEnabled && !isInitialGracePeriod) {
              playAlarmSound(config.alarmSound);
          }

          // Trigger Desktop Notification when tab is minimized, in background, or inactive
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                  const secondsUntilStart = Math.max(0, Math.ceil((fullScreenAlertItem.startTime.getTime() - now.getTime()) / 1000));
                  const notif = new Notification(`⚠️ PERINGATAN: START REAKTOR ${fullScreenAlertItem.reactorId}`, {
                      body: `Reaktor ${fullScreenAlertItem.reactorId} (Batch ${fullScreenAlertItem.batchNumber} - ${fullScreenAlertItem.grade}) akan segera START dalam ${secondsUntilStart} detik!`,
                      icon: '/favicon.ico',
                      tag: `reactor-alert-${fullScreenAlertItem.id}`,
                      requireInteraction: true
                  });
                  notif.onclick = () => {
                      window.focus();
                      notif.close();
                  };
              } catch (e) {
                  console.warn("Desktop notification trigger failed:", e);
              }
          }
      } else if (!fullScreenAlertItem) {
          setLastAlertedId(null);
      }
  }, [fullScreenAlertItem, lastAlertedId, config.audioEnabled, config.alarmSound, now]);

  // Tab Title Flashing during Full Screen Alert
  useEffect(() => {
      if (!fullScreenAlertItem) {
          document.title = "SCHEDULE START PVC 5";
          return;
      }

      let isFlashing = false;
      const originalTitle = "SCHEDULE START PVC 5";
      const alertTitle = `🚨 [ALARM R${fullScreenAlertItem.reactorId}] START BATCH ${fullScreenAlertItem.batchNumber}!`;

      const interval = setInterval(() => {
          isFlashing = !isFlashing;
          document.title = isFlashing ? alertTitle : `⚠️ REAKTOR ${fullScreenAlertItem.reactorId} STARTING...`;
      }, 800);

      return () => {
          clearInterval(interval);
          document.title = originalTitle;
      };
  }, [fullScreenAlertItem]);

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
      <header
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-sm z-30 relative transition-colors duration-300"
        /* tableFontSize disetel untuk layar kontrol; di HP dibatasi agar
           angka jam dan countdown tidak melebihi lebar layar. */
        style={{ fontSize: `${isDesktop ? config.tableFontSize : Math.min(config.tableFontSize, 15)}px` }}
      >
        
        {/* Main Header Container */}
        <div className="flex flex-wrap lg:flex-nowrap flex-row items-center justify-between gap-2 w-full max-w-[1920px] mx-auto relative lg:overflow-x-auto pb-0.5">
          
          {/* Left Section: Widget */}
          <div className="flex shrink-0 lg:flex-1 order-3 lg:order-1 w-full lg:w-auto">
               {/* Widget: interval dan countdown start berikutnya. */}
               <div className="flex flex-col lg:flex-row bg-slate-800 rounded-lg p-1 shadow-md w-full lg:w-auto gap-1 lg:gap-0">
                      {/* Interval */}
                      <div className="flex w-full lg:w-auto shrink-0 px-2 lg:px-4 py-1.5 flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-700/50 min-w-[86px] lg:min-w-[125px] relative overflow-hidden group">
                         {/* Subtle pulsing bg */}
                         <div className="absolute inset-0 bg-cyan-500/5 dark:bg-cyan-400/5 rounded-l-lg pointer-events-none"></div>
                         
                         <span className="text-[0.5em] text-cyan-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 z-10">
                            <Timer className="w-3 h-3 text-cyan-400 animate-pulse" />
                            INTERVAL
                         </span>
                         <div className="text-[1.5em] font-mono font-black text-cyan-300 leading-none drop-shadow-[0_0_8px_rgba(34,211,238,0.25)] animate-[pulse_3s_ease-in-out_infinite] z-10">
                             {config.intervalHours.toString().padStart(2, '0')}:{config.intervalMinutes.toString().padStart(2, '0')}
                         </div>
                      </div>

                      {/* Countdown: start reaktor berikutnya */}
                      <div className="w-full lg:w-auto px-2 lg:px-3 py-1.5 flex items-stretch gap-2 border-t lg:border-t-0 lg:border-l border-slate-700/50 min-w-0 lg:min-w-[230px] relative overflow-hidden">
                         <div className={`absolute inset-0 rounded-r-lg pointer-events-none ${
                            isNextStartImminent ? 'bg-red-500/10' : 'bg-amber-500/5'
                         }`}></div>

                         {/* Badge reaktor: self-stretch membuatnya setinggi
                             ketiga baris teks di sebelah kanannya. */}
                         {nextStartItem && (
                            <span /* Di HP badge setinggi kartu; di desktop separuh ukurannya dan
                                  cukup sejajar tengah, karena panelnya sudah ramai. */
                               className={`z-10 shrink-0 self-stretch lg:self-center w-[2.4em] lg:w-[1.8em] lg:h-[1.8em] rounded-lg flex items-center justify-center font-black text-[1.7em] lg:text-[0.85em] leading-none shadow-sm ${nextStartReactor?.color || 'bg-slate-600'} ${nextStartReactor?.textColor || 'text-white'}`}>
                               {nextStartItem.reactorId}
                            </span>
                         )}

                       <div className="z-10 flex-1 min-w-0 flex flex-col items-center justify-center">
                         <span className="text-[0.5em] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Timer className={`w-3 h-3 ${
                               isNextStartImminent ? 'text-red-400' : 'text-amber-400'
                            }`} />
                            START BERIKUTNYA DALAM
                         </span>

                         {nextStartItem && nextStartSeconds !== null ? (
                            <div className="flex flex-col items-center gap-1 w-full">
                               <div className="flex items-center gap-1.5">
                                  <span className={`flex items-center gap-1 leading-none ${
                                     isNextStartImminent ? 'text-red-400' : 'text-amber-300'
                                  }`}>
                                     {nextStartMinutes !== null && nextStartMinutes > 0 && (
                                        <>
                                           <NumberTicker
                                              value={nextStartMinutes}
                                              startOnView={false}
                                              className="font-mono font-black text-[1.5em] tracking-tight"
                                           />
                                           <span className="self-center text-[0.5em] font-bold uppercase leading-none tracking-wider opacity-75">menit</span>
                                        </>
                                     )}
                                     <NumberTicker
                                        value={nextStartRemSeconds ?? 0}
                                        pad={2}
                                        startOnView={false}
                                        className="font-mono font-black text-[1.5em] tracking-tight"
                                     />
                                     <span className="self-center text-[0.5em] font-bold uppercase leading-none tracking-wider opacity-75">detik</span>
                                  </span>
                               </div>
                               <div className="flex items-center gap-1.5 text-[0.5em] font-bold uppercase tracking-wider text-slate-400">
                                  <span>#{nextStartItem.batchNumber}</span>
                                  <span className={`px-1.5 py-px rounded text-white ${GRADE_COLORS[nextStartItem.grade]}`}>
                                     {nextStartItem.grade}
                                  </span>
                                  <span>{formatTime(nextStartItem.startTime)}</span>
                               </div>
                            </div>
                         ) : (
                            <div className="font-mono font-black text-[1.5em] leading-none text-slate-500">
                               {config.isStopped ? 'STOPPED' : '--:--'}
                            </div>
                         )}
                       </div>
                      </div>
               </div>
          </div>

          {/* Center Section: Title with 30-Second Dynamic Animation Rotation */}
          <div 
            key={cycle30s}
            className={`flex flex-col items-center justify-center order-1 lg:order-2 flex-1 lg:flex-none lg:shrink-0 min-w-0 overflow-hidden px-3 lg:px-5 py-1.5 lg:py-2 rounded-2xl backdrop-blur-md border shadow-md mx-0 lg:mx-4 transition-all duration-700 animate-in fade-in zoom-in-95 relative overflow-hidden group ${currentColorScheme.headerBg} ${currentColorScheme.headerBorder}`}
          >
            <h1 className={`text-[1.35em] lg:text-[2.0em] font-black tracking-tighter leading-none uppercase flex items-center gap-2 drop-shadow-sm transition-all duration-700 ${currentColorScheme.titleAnimClass || ''}`}>
               <span className={`transition-all duration-700 ${currentColorScheme.schedule}`}>SCHEDULE</span> 
               <span className={`transition-all duration-700 ${currentColorScheme.start}`}>START</span>
            </h1>

            {/* Reaktor + tanggal disembunyikan di HP; tanggal sudah ada di daftar
                batch dan barisnya memakan lebar yang dibutuhkan judul. */}
            <div className="hidden lg:flex items-center gap-4 mt-1 border-t-2 border-slate-200/80 dark:border-slate-700/80 pt-1 w-full justify-center">
                <span className={`text-[0.85em] font-black tracking-widest uppercase transition-colors duration-700 ${currentColorScheme.reaktor}`}>
                    REAKTOR PVC 5
                </span>
            </div>
          </div>

          {/* Right Section: Breadcrumb — navigasi pindah seluruhnya ke sidebar kanan */}
          <div className="flex shrink-0 lg:flex-1 items-center lg:items-stretch justify-end gap-2 order-2 lg:order-3">
              <ShiftToday date={now} className="hidden lg:flex" />
              <Breadcrumb view={currentView} group={currentGroup} />

              {/* Pembuka drawer. Di desktop sidebar selalu terlihat, jadi disembunyikan. */}
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="Buka menu navigasi"
                className="lg:hidden shrink-0 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
          </div>
        </div>
    </header>
  );

  const renderSettingsModal = () => {
    if (!isSettingsOpen) return null;

    return (
      <div className="fixed inset-0 pointer-events-none z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <DraggableModal className="w-full max-w-4xl flex flex-col max-h-[90vh]">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col ring-4 ring-blue-500/40">
          
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    Pengaturan Sistem
                    <span className="hidden lg:inline px-2 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold rounded border border-blue-200 dark:border-blue-700 select-none">
                      ✋ Tahan & Drag
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Konfigurasi alarm, sequence, cycle time & tampilan
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Countdown timer */}
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs">
                  <ClockIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
                  <span className="text-[11px]">Tutup: <span className="font-mono font-black">{formatCountdown(settingsCountdown)}</span></span>
                  <button 
                    onClick={() => setSettingsCountdown(120)}
                    className="ml-1 text-[9px] px-1.5 py-0.5 bg-amber-200/80 dark:bg-amber-800/60 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 rounded font-black uppercase transition-colors cursor-pointer"
                    title="Reset timer ke 2 menit"
                  >
                    Reset
                  </button>
                </div>

                {/* Close button */}
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Tutup Pengaturan"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50 dark:bg-slate-900/50 max-h-[70vh]">
            
            {/* DB Schema Error Alert */}
            {dbSchemaError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/40 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-black text-sm uppercase tracking-tight mb-1">Database Schema Outdated</p>
                  <p className="opacity-90 font-medium">
                    {dbSchemaError}. Jalankan update script di Supabase SQL Editor jika diperlukan.
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button 
                      onClick={() => {
                        let sql = "";
                        if (dbSchemaError.includes('alarm_sound')) {
                          sql += "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS alarm_sound TEXT DEFAULT 'siren';\n";
                        }
                        if (dbSchemaError.includes('alert_style')) {
                          sql += "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS alert_style TEXT DEFAULT 'classic';\n";
                        }
                        if (dbSchemaError.includes('grade_mode')) {
                          sql += "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS grade_mode TEXT DEFAULT 'normal';\n";
                        }
                        if (dbSchemaError.includes('cycle_time_data')) {
                          sql += "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS cycle_time_data JSONB DEFAULT '[{\"id\": 1, \"ns\": \"\", \"readyBlowing\": \"\", \"blowing\": \"\", \"blowingComplete\": \"\"}, {\"id\": 2, \"ns\": \"\", \"readyBlowing\": \"\", \"blowing\": \"\", \"blowingComplete\": \"\"}]'::jsonb;\n";
                        }
                        if (dbSchemaError.includes('custom_interval_hours') || dbSchemaError.includes('custom_interval_minutes')) {
                          sql += "ALTER TABLE schedule_overrides ADD COLUMN IF NOT EXISTS custom_interval_hours INT DEFAULT NULL;\n" +
                                 "ALTER TABLE schedule_overrides ADD COLUMN IF NOT EXISTS custom_interval_minutes INT DEFAULT NULL;\n";
                        }
                        if (!sql) {
                          sql = "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS alarm_sound TEXT DEFAULT 'siren';\n" +
                                "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS alert_style TEXT DEFAULT 'classic';\n" +
                                "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS grade_mode TEXT DEFAULT 'normal';\n" +
                                "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS cycle_time_data JSONB DEFAULT '[{\"id\": 1, \"ns\": \"\", \"readyBlowing\": \"\", \"blowing\": \"\", \"blowingComplete\": \"\"}, {\"id\": 2, \"ns\": \"\", \"readyBlowing\": \"\", \"blowing\": \"\", \"blowingComplete\": \"\"}]'::jsonb;\n" +
                                "ALTER TABLE schedule_overrides ADD COLUMN IF NOT EXISTS custom_interval_hours INT DEFAULT NULL;\n" +
                                "ALTER TABLE schedule_overrides ADD COLUMN IF NOT EXISTS custom_interval_minutes INT DEFAULT NULL;";
                        }
                        navigator.clipboard.writeText(sql);
                        alert("SQL berhasil disalin ke clipboard!");
                      }}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black text-[10px] transition-colors uppercase"
                    >
                      Copy SQL Fix
                    </button>
                    <button 
                      onClick={() => setDbSchemaError(null)}
                      className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-[10px] transition-colors uppercase"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* Card 1: Audio & Zoom */}
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-3">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-500" /> Audio & Tampilan Zoom
                </label>
                <button 
                  onClick={toggleAudio} 
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border transition-all cursor-pointer ${config.audioEnabled ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}
                >
                  {config.audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span className="font-black text-xs uppercase tracking-tight">
                    ALARM SUARA: {config.audioEnabled ? 'AKTIF (ON)' : 'MATI (OFF)'}
                  </span>
                </button>
                <div className="flex items-center bg-slate-100 dark:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-600 p-1">
                  <button onClick={handleZoomOut} className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer" title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black flex-1 text-center text-slate-700 dark:text-slate-200 select-none cursor-pointer" onClick={handleZoomReset} title="Klik untuk Reset Zoom (100%)">
                    ZOOM: {Math.round(zoomLevel * 100)}%
                  </span>
                  <button onClick={handleZoomIn} className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer" title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 2: Sequence & Stop Controls */}
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-3">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-red-500" /> Kontrol Sequence & System
                </label>
                <button 
                  onClick={() => {
                    setIsSettingsOpen(false);
                    handleResetSequence();
                  }} 
                  className="flex items-center justify-center gap-2 p-2.5 rounded-lg font-black bg-red-600 hover:bg-red-700 text-white transition-all shadow-xs active:scale-95 text-xs uppercase cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  INPUT FOR RE-S
                </button>
                <button 
                  onClick={toggleStop} 
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg font-black border transition-all text-xs uppercase cursor-pointer ${config.isStopped ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/80 hover:bg-red-100'}`}
                >
                  {config.isStopped ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                  {config.isStopped ? "RESUME SYSTEM" : "FREEZE / STOP SYSTEM"}
                </button>
              </div>

              {/* Card 3: Alarm Sound Choice */}
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-2.5">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" /> Pilihan Suara Alarm
                </label>
                <select 
                  value={tempAlarmSound} 
                  onChange={(e) => {
                    const newSound = e.target.value as AlarmSoundType;
                    setTempAlarmSound(newSound);
                    handleConfigChange('alarmSound', newSound);
                    playAlarmSound(newSound);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="siren">🚨 Siren (Original)</option>
                  <option value="siren_polisi">🚓 Siren Polisi (10s)</option>
                  <option value="siren_kebakaran">🚒 Siren Kebakaran (10s)</option>
                  <option value="kicau_mania">🐦 Kicau Mania (10s)</option>
                  <option value="google_robot">🤖 Google/Robot Voice ("Woy Woy Start")</option>
                  <option value="rocket">🚀 Suara Roket (rocket)</option>
                  <option value="jet">✈️ Suara Pesawat Jet (jet)</option>
                  <option value="powerpoint">📊 PowerPoint Chime</option>
                  <option value="bomb">💣 Bomb Explosion</option>
                  <option value="fajar_sadboy">💃 Gaspol Dangak (Lagu 10s)</option>
                  <option value="train">🚂 Suara Kereta Api (train)</option>
                  <option value="car_horn">🚗 Suara Klakson Mobil (car_horn)</option>
                  <option value="ship_horn">🚢 Suara Klakson Kapal (ship_horn)</option>
                  <option value="ringtone">📞 Suara Nada Dering (ringtone)</option>
                  <option value="missile">🚀 Suara Tembakan Rudal (missile)</option>
                  <option value="crow">🐦 Suara Burung Gagak (crow)</option>
                  <option value="magic_spell">🪄 Magic Spell (magic_spell)</option>
                  <option value="ufo">🛸 UFO Beam (ufo)</option>
                  <option value="laser">🔫 Alien Laser (laser)</option>
                  <option value="telephone">☎️ Old Telephone Ring (telephone)</option>
                  <option value="arcade">👾 Retro Arcade Chime (arcade)</option>
                  <option value="gong">🔔 Epic Gong Strike (gong)</option>
                </select>
                <button 
                  onClick={() => playAlarmSound(tempAlarmSound)}
                  className="w-full py-1.5 px-3 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  TES SUARA INI
                </button>
              </div>
            </div>

            {/* Cycle Parameters & Alert Timing */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-3 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-indigo-500" /> Parameter Interval & Cycle Time
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* Interval */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Interval (HH:MM)</span>
                  <div className="flex gap-1 items-center">
                    <input 
                      type="number" min="0" max="23" 
                      value={config.intervalHours} 
                      onChange={(e) => handleConfigChange('intervalHours', parseInt(e.target.value) || 0)} 
                      className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2 text-sm font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                    <span className="font-bold">:</span>
                    <input 
                      type="number" min="0" max="59" 
                      value={config.intervalMinutes} 
                      onChange={(e) => handleConfigChange('intervalMinutes', parseInt(e.target.value) || 0)} 
                      className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2 text-sm font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                </div>

                {/* Batch Duration */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Batch Dur (Min)</span>
                  <input 
                    type="number" min="1" max="600" 
                    value={config.batchDurationMinutes} 
                    onChange={(e) => handleConfigChange('batchDurationMinutes', parseInt(e.target.value) || 1)} 
                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2 text-sm font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>

                {/* View Cycles */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">View Cycles (Col)</span>
                  <input 
                    type="number" min="1" max="10" 
                    value={config.columnsToDisplay} 
                    onChange={(e) => handleConfigChange('columnsToDisplay', parseInt(e.target.value) || 1)} 
                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2 text-sm font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>

                {/* Full Alert Countdown */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Alert Trigger (Detik)</span>
                  <input 
                    type="number" min="0" max="300" 
                    value={config.alertThresholdSeconds} 
                    onChange={(e) => handleConfigChange('alertThresholdSeconds', parseInt(e.target.value) || 0)} 
                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2 text-sm font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>
            </div>

            {/* Running Text Alert (Marquee) */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase block flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-yellow-500" /> Running Text Alert & Kecepatan
              </label>
              <div className="flex gap-2">
                <button 
                  onClick={toggleMarqueePause} 
                  className={`px-3 py-2 rounded-lg border font-black transition-all text-xs cursor-pointer ${config.isMarqueePaused ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`} 
                  title={config.isMarqueePaused ? "Resume Animation" : "Pause Animation"}
                >
                  {config.isMarqueePaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <input 
                  type="text" 
                  value={config.runningText} 
                  onChange={(e) => handleConfigChange('runningText', e.target.value)} 
                  className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-bold text-yellow-800 bg-yellow-50/60 dark:bg-slate-700 dark:text-yellow-400 focus:ring-2 focus:ring-yellow-400 outline-none" 
                  placeholder="Ketik running text alert di sini..." 
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[9px] font-black text-slate-400">FAST (5s)</span>
                <input 
                  type="range" 
                  min="5" 
                  max="300" 
                  step="1" 
                  value={config.marqueeSpeed} 
                  onChange={(e) => handleConfigChange('marqueeSpeed', parseInt(e.target.value))} 
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600" 
                />
                <span className="text-[9px] font-black text-slate-400">SLOW ({config.marqueeSpeed}s)</span>
              </div>
            </div>

            {/* Pilihan Gaya Tampilan Full Alert (9 Tema) */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-amber-500" /> Tema Gaya Tampilan Full Alert
                    </label>
                    <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/80 flex items-center gap-1 uppercase">
                      <Check className="w-2.5 h-2.5 text-emerald-600" /> AKTIF: {
                        {
                          classic: '1. Klasik Reaktor',
                          neon: '2. Cyber Neon',
                          emergency: '3. Emergency Sirens',
                          glass: '4. Modern Glass HUD',
                          industrial: '5. Industrial Safety',
                          holo: '6. Hologram Sci-Fi',
                          matrix: '7. Terminal Matrix',
                          minimal: '8. Minimalist Bold',
                          warning_stripe: '9. Caution Tag Hazard'
                        }[config.alertStyle || 'classic']
                      }
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setTestAlertStyle(config.alertStyle || 'classic');
                    }}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] rounded-lg shadow-xs flex items-center gap-1 uppercase cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-black" /> PREVIEW FULL SCREEN
                  </button>
                  <button 
                    onClick={() => setIsAlertStyleSectionOpen(prev => !prev)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg border border-slate-200 dark:border-slate-600 flex items-center gap-1 uppercase cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" />
                    {isAlertStyleSectionOpen ? <>Tutup Tema <ChevronUp className="w-3 h-3" /></> : <>Pilih Tema (9) <ChevronDown className="w-3 h-3" /></>}
                  </button>
                </div>
              </div>

              {isAlertStyleSectionOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 animate-in fade-in duration-200">
                  {[
                    { key: 'classic' as const, title: '1. Klasik Reaktor', badge: '🔴 Klasik', bgClass: 'bg-red-600 text-white', desc: 'Kontras tinggi khas reaktor & badge countdown.' },
                    { key: 'neon' as const, title: '2. Cyber Neon', badge: '⚡ Cyber Neon', bgClass: 'bg-slate-950 text-amber-300 border border-amber-400', desc: 'Tema futuristik gelap dengan border neon.' },
                    { key: 'emergency' as const, title: '3. Emergency Sirens', badge: '🚨 Sirene', bgClass: 'bg-red-950 text-yellow-300 border border-red-500', desc: 'Tema darurat pabrik dengan efek strobe.' },
                    { key: 'glass' as const, title: '4. Modern Glass HUD', badge: '💎 Glass HUD', bgClass: 'bg-slate-900 text-slate-100 border border-white/30', desc: 'Desain berkaca transparan modern.' },
                    { key: 'industrial' as const, title: '5. Industrial Safety', badge: '🚧 Safety Gate', bgClass: 'bg-amber-500 text-black border border-black', desc: 'Strip keselamatan pabrik industri tebal.' },
                    { key: 'holo' as const, title: '6. Hologram Sci-Fi', badge: '🌐 Hologram', bgClass: 'bg-slate-950 text-cyan-300 border border-cyan-400', desc: 'Konsol hologram cyan neon futuristik.' },
                    { key: 'matrix' as const, title: '7. Terminal Matrix', badge: '📟 Terminal', bgClass: 'bg-black text-emerald-400 border border-emerald-500 font-mono', desc: 'Terminal industri hijau matrix berkedip.' },
                    { key: 'minimal' as const, title: '8. Minimalist Bold', badge: '🔲 Minimalist', bgClass: 'bg-slate-100 text-slate-900 border border-slate-900', desc: 'Kontras ultra tinggi fungsional bersih.' },
                    { key: 'warning_stripe' as const, title: '9. Caution Tag Hazard', badge: '⚠️ Caution Tag', bgClass: 'bg-yellow-400 text-slate-950 border border-black', desc: 'Papan peringatan hazard kuning pabrik.' }
                  ].map((item) => {
                    const isSelected = (config.alertStyle || 'classic') === item.key;
                    return (
                      <div 
                        key={item.key} 
                        className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 ${isSelected ? 'border-amber-500 ring-2 ring-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'}`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">{item.title}</span>
                            {isSelected && <span className="text-[8px] bg-emerald-500 text-white font-bold px-1 rounded">AKTIF</span>}
                          </div>
                          <div className={`py-2 px-1 rounded text-center text-[10px] font-black mb-1 ${item.bgClass}`}>
                            {item.badge}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{item.desc}</p>
                        </div>
                        <div className="flex gap-1 pt-1">
                          <button 
                            onClick={() => {
                              setIsSettingsOpen(false);
                              setTestAlertStyle(item.key);
                            }}
                            className="flex-1 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] font-bold rounded uppercase cursor-pointer"
                          >
                            Preview
                          </button>
                          <button 
                            onClick={() => handleConfigChange('alertStyle', item.key)}
                            className={`flex-1 py-1 text-[9px] font-black rounded uppercase cursor-pointer ${isSelected ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                          >
                            {isSelected ? 'Terpilih ✓' : 'Pilih'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Browser Notification & Next Cycle Footer Info */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <FastForward className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold">
                  Next Sequence: <strong className="font-mono">#{nextStartParams.batch}</strong> ({new Date(nextStartParams.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})
                </span>
              </div>
              <button 
                onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        new Notification("Notifications Enabled", { body: "Notifikasi start reaktor telah diaktifkan." });
                      }
                    });
                  }
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[10px] uppercase cursor-pointer"
              >
                Aktifkan Notifikasi Browser
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">Perubahan langsung tersimpan otomatis</span>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="px-5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-black text-xs rounded-xl shadow-xs transition-colors uppercase tracking-wider cursor-pointer"
            >
              Tutup Pengaturan
            </button>
          </div>
        </div>
      </DraggableModal>
    </div>
  );
};


  const renderGradeSelectionWidget = () => {
      return (
          <div className="flex flex-col shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="bg-slate-800 text-white font-bold text-[0.7em] px-3 py-2 text-center uppercase tracking-tight">
                  Grade Selection Mode
              </div>
              <div className="p-2 flex flex-col gap-2">
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                      <button 
                        onClick={() => handleConfigChange('gradeMode', 'normal')}
                        className={`flex-1 py-2 rounded-md font-black text-[0.7em] transition-all ${config.gradeMode === 'normal' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          NORMAL
                      </button>
                      <button 
                        onClick={openGradeChangeModal}
                        className={`flex-1 py-2 rounded-md font-black text-[0.7em] transition-all ${config.gradeMode === 'gradeChange' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          GRADE CHANGE
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1">
                      {GRADES.map(g => (
                          <button 
                            key={g} 
                            onClick={() => handleConfigChange('currentGrade', g)}
                            className={`py-2 rounded-lg font-black text-[0.8em] transition-all ${config.currentGrade === g ? `${GRADE_COLORS[g]} text-white shadow-md` : 'bg-slate-50 dark:bg-slate-900 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                              {g}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  const renderSiloWidget = () => {
      const activeSiloData = siloState.activeSilo ? siloState.silos[siloState.activeSilo] : null;
      return (
          <div className="flex flex-col shadow-sm rounded-xl border border-slate-200 dark:border-slate-700">
              <button 
                  onClick={() => setCurrentView('silo')}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[0.85em] px-3 py-2 text-center rounded-t-xl flex items-center justify-center gap-2 transition-colors cursor-pointer w-full uppercase tracking-tight"
              >
                  <Maximize2 className="w-3 h-3" />
                  SILO SETTING
              </button>
              <div className="flex min-h-0">
                  <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-black p-2 flex items-center justify-center w-full rounded-b-xl relative overflow-hidden group">
                       <span className="text-[5.46rem] mr-2 drop-shadow-sm text-cyan-600 dark:text-cyan-400 animate-pulse leading-none">{siloState.activeSilo || '-'}</span>
                       <div className="flex flex-col leading-tight text-left border-l-2 border-slate-200 dark:border-slate-700 pl-2 gap-1 w-full">
                           <div className="flex flex-col gap-0.5 text-center">
                               <div>
                                   <span className="text-[0.85em] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider">START</span>
                                   <span className="text-[1.3em] block text-slate-800 dark:text-white leading-none">{activeSiloData?.startTime || '--:--'}</span>
                               </div>
                               <div>
                                   <span className="text-[0.85em] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider">SET</span>
                                   <span className="text-[1.3em] block text-slate-800 dark:text-white leading-none">{activeSiloData?.capacitySet || '0'} T</span>
                               </div>
                           </div>
                           <div className="mt-1 pr-2">
                               <div className="w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
                                   <div className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[0.85em] font-bold uppercase tracking-wider py-1 border-b border-slate-200 dark:border-slate-700 text-center">
                                       LOT NUMBER
                                   </div>
                                   <div className="bg-white dark:bg-slate-800 text-center py-1.5">
                                       <span className="text-[1.45em] font-mono font-bold text-slate-800 dark:text-white">
                                           {activeSiloData?.lotNumber || '---'}
                                       </span>
                                   </div>
                               </div>
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderSteamWidget = () => {
      return (
          <div className="flex flex-col shadow-sm rounded-xl w-full border border-slate-200 dark:border-slate-700 demonomer-widget-container">
              <button 
                  onClick={() => setIsDemonomerPopupOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[0.85em] px-2 py-2 text-center rounded-t-xl flex items-center justify-center gap-1 uppercase tracking-tight cursor-pointer transition-colors w-full relative"
              >
                  <Activity className="w-3 h-3" />
                  ADJUST STEAM
                  {config.gradeMode === 'gradeChange' && (
                      <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-sm px-2 py-1 rounded-md font-black ${GRADE_COLORS[activeDemonomerGrade]} border border-white/20 shadow-sm`}>
                          {activeDemonomerGrade}
                      </span>
                  )}
              </button>
              <div className="bg-white dark:bg-slate-800 rounded-b-xl p-1.5 flex flex-col gap-1.5 justify-center">
                  <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner flex flex-col justify-center">
                      <label 
                          onClick={() => setIsFie2002TrendOpen(true)}
                          className="text-[0.85em] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1 mb-0.5 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                          title="Klik tulisan FIE2002 untuk melihat Grafik Trend Perjam"
                      >
                          FIE2002
                          <TrendingUp className="w-3.5 h-3.5 text-cyan-500 animate-pulse group-hover:scale-125 transition-transform" />
                      </label>
                      <input 
                          type="number"
                          step="0.1"
                          value={demonomerData.f2002}
                          onChange={(e) => handleDemonomerChange('f2002', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-3xl font-black text-center outline-none drop-shadow-sm appearance-none"
                      />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner flex flex-col justify-center">
                      <span className="text-[0.85em] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-center mb-0.5">RESULT</span>
                      <div className="text-3xl font-black text-center drop-shadow-sm">
                          {Math.round(evaluateMath(demonomerData.steamFormula, {
                              'PVC': evaluateMath(demonomerData.pvcFormula, {
                                  'AI2802': demonomerData.aie2802,
                                  '%PVC': demonomerData.pvcPercent / 100,
                                  'F2002': demonomerData.f2002
                              }),
                              'Steam Rasio': demonomerData.multipliers[activeDemonomerGrade] || 0,
                              'Multiplier': demonomerData.multipliers[activeDemonomerGrade] || 0
                          }))}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderCatalystMiniWidget = () => {
      return (
          <div className="flex flex-col flex-1 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 catalyst-widget-container min-h-0">
              <div 
                  onClick={openCatalystModal}
                  className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer text-white font-bold text-[0.8em] px-3 py-2 text-center flex items-center justify-between gap-2 uppercase tracking-tight transition-colors shrink-0"
                  title="Click to open Catalyst Presets Settings"
              >
                  <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3 animate-pulse" />
                      CATALYST DATA
                  </div>
                  <Sliders className="w-3.5 h-3.5 opacity-80" />
              </div>
              <div className="p-2 flex-1 flex flex-col justify-center">
                  <table className="w-full border-collapse h-full">
                      <thead>
                          <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                              <th className="py-1 text-left font-black text-[0.7em] uppercase tracking-wider">CATA</th>
                              <th className="py-1 text-center font-black text-[0.7em] uppercase tracking-wider">NETO</th>
                              <th className="py-1 text-center font-black text-[0.7em] uppercase tracking-wider">BRUTO</th>
                          </tr>
                      </thead>
                      <tbody>
                          {(['f', 'h', 'g'] as const).map((key) => (
                              <tr key={key} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                                  <td className={`py-2 font-black uppercase text-center rounded-l-md ${key === 'f' ? 'bg-slate-800 text-white' : key === 'h' ? 'bg-yellow-400 text-slate-900' : 'bg-purple-600 text-white'}`} style={{ width: '30px', fontSize: '1.1em' }}>
                                      {key}
                                  </td>
                                  <td className="py-1 px-1">
                                      <input 
                                          type="text" 
                                          value={catalystData[key]?.netto || ''} 
                                          onChange={(e) => handleCatalystChange(key, 'netto', e.target.value)}
                                          className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-center font-bold py-1 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-[1.1em]"
                                      />
                                  </td>
                                  <td className="py-1 px-1">
                                      <input 
                                          type="text" 
                                          value={catalystData[key]?.bruto || ''} 
                                          onChange={(e) => handleCatalystChange(key, 'bruto', e.target.value)}
                                          className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-center font-bold py-1 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-[1.1em]"
                                      />
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

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
        <div
          className="w-full lg:h-full flex flex-col lg:flex-row gap-2"
          /* tableFontSize disetel untuk layar kontrol besar; di HP dibatasi
             supaya isi sel tidak saling tindih. */
          style={{ fontSize: `${isDesktop ? config.tableFontSize : Math.min(config.tableFontSize, 13)}px` }}
        >
          {/* LEFT SIDE: 80% Table */}
          <div className="w-full lg:w-[80%] flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            
             {/* MARQUEE BAR: Placed between header and table rows */}
             <div className={`w-full ${currentColorScheme.marqueeBg} border-b ${currentColorScheme.marqueeBorder} overflow-hidden h-10 relative flex items-center transition-all duration-1000`}>
                  
                  <div className="flex-1 overflow-hidden h-full relative flex items-center">
                       <div className="absolute inset-0 flex items-center w-full">
                            <div className={`absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r ${currentColorScheme.marqueeGradientFrom} to-transparent pointer-events-none transition-all duration-1000`}></div>
                            <div className={`absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l ${currentColorScheme.marqueeGradientFrom} to-transparent pointer-events-none transition-all duration-1000`}></div>
                            
                            <div className="flex whitespace-nowrap w-full">
                                 <div 
                                     className={`flex shrink-0 animate-marquee items-center min-w-full ${config.isMarqueePaused ? 'paused' : ''}`}
                                     style={{ animationDuration: `${config.marqueeSpeed}s` }}
                                 >
                                     {Array(5).fill(null).map((_, i) => (
                                         <span key={i} className={`flex items-center gap-2 mx-8 font-black uppercase tracking-wider text-[0.875em] transition-colors duration-1000 ${currentColorScheme.marqueeText}`}>
                                             <AlertTriangle className="w-[1.25em] h-[1.25em]" />
                                             {autoRunningText}
                                         </span>
                                     ))}
                                 </div>
                                 <div 
                                     className={`flex shrink-0 animate-marquee items-center min-w-full ${config.isMarqueePaused ? 'paused' : ''}`} 
                                     style={{ animationDuration: `${config.marqueeSpeed}s` }}
                                     aria-hidden="true"
                                 >
                                     {Array(5).fill(null).map((_, i) => (
                                         <span key={i + 10} className={`flex items-center gap-2 mx-8 font-black uppercase tracking-wider text-[0.875em] transition-colors duration-1000 ${currentColorScheme.marqueeText}`}>
                                             <AlertTriangle className="w-[1.25em] h-[1.25em]" />
                                             {autoRunningText}
                                         </span>
                                     ))}
                                 </div>
                            </div>
                       </div>
                  </div>
             </div>

            <div ref={schedulerScrollRef} className="overflow-x-auto lg:h-full">
              <table
                className="w-full border-collapse lg:h-full table-fixed"
                style={isDesktop ? undefined : { minWidth: `${MOBILE_REACTOR_COL + config.columnsToDisplay * MOBILE_CELL_MIN}px` }}
              >
                {/* Removed <thead> to align with image where the first row is just data rows */}
                <tbody>
                  {REACTORS.map((reactor) => (
                    <tr key={reactor.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0" style={{ height: `${isDesktop ? config.tableRowHeight : Math.min(config.tableRowHeight, 58)}px` }}>
                      
                      <td 
                        /* sticky: tanpa ini huruf reaktor ikut hilang saat tabel
                           digeser ke kanan dan barisnya jadi tak dikenali. */
                        className={`${reactor.color} ${reactor.textColor} border-r border-slate-900/10 dark:border-slate-900/30 p-1 lg:p-2 relative group sticky left-0 z-20`}
                        style={{
                          width: `${isDesktop ? 140 : MOBILE_REACTOR_COL}px`,
                          minWidth: `${isDesktop ? 140 : MOBILE_REACTOR_COL}px`,
                          maxWidth: `${isDesktop ? 140 : MOBILE_REACTOR_COL}px`,
                        }}
                      >
                         <div className="flex flex-col items-center justify-center h-full">
                            <span className="font-black font-serif drop-shadow-md leading-none" style={{ fontSize: '2.2em' }}>{reactor.label}</span>
                            
                            {/* Reactor Note Display */}
                            <div 
                              className="mt-2 w-full cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => openReactorNoteModal(reactor.id)}
                              title="Click to edit note"
                            >
                               {config.reactorNotes[reactor.id] ? (
                                   <div className="bg-yellow-400 text-black font-bold text-left rounded px-1 border-2 border-red-600 shadow-sm whitespace-pre-wrap break-words leading-tight" style={{ fontSize: '0.6em' }}>
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
                        
                        const isFuture = !isPast && !isActive && !isSkipped;
                        
                        // Base table cell styles
                        const baseClasses = "p-0 border-r cursor-pointer transition-all duration-300 relative group hover:z-20 hover:ring-2 hover:ring-blue-400 overflow-hidden shadow-sm";
                        
                        // Robust conditional status styling array
                        const statusClasses = [
                            // 1. SKIPPED STATUS
                            isSkipped && "bg-black dark:bg-black text-red-500 dark:text-red-500 border-black dark:border-black shadow-inner opacity-95",
                            
                            // 2. ACTIVE STATUS
                            isActive && "bg-red-500 dark:bg-red-600 text-white animate-[pulse_2s_ease-in-out_infinite] ring-4 ring-red-400 dark:ring-red-900 z-10 scale-[1.02] shadow-xl border-red-500 dark:border-red-600",
                            
                            // 3. PAST STATUS
                            isPast && !isSkipped && "bg-blue-950 dark:bg-slate-900 text-white shadow-inner border-slate-200 dark:border-slate-800",
                            
                            // 4. FUTURE STATUSES
                            isFuture && mode === 'CLOSE TO OPEN' && "bg-white dark:bg-white text-slate-900 dark:text-slate-900 border-slate-200 dark:border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-50",
                            isFuture && mode !== 'CLOSE TO OPEN' && "bg-white dark:bg-white text-slate-900 dark:text-slate-900 border-slate-200 dark:border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-50"
                        ].filter(Boolean).join(" ");
                        
                        const cellClasses = `${baseClasses} ${statusClasses}`;
                        
                        const skipReason = item.config?.skipReason || 'PASS';
                        const skipTextMap: Record<string, string> = {
                            'PASS': 'PASS',
                            'CLEANING_ROBOT': 'CLEANING ROBOT',
                            'ABNORMAL_REAKSI': 'ABNORMAL REAKSI',
                            'MAINTENANCE': 'MAINTENANCE',
                            'POISON_CHARGE': 'POISON CHARGE'
                        };
                        const displaySkipText = skipTextMap[skipReason] || 'PASS';
                        
                        const modeBadgeClasses = mode === 'OPEN' 
                            ? `bg-blue-50 ${isFuture ? 'dark:bg-blue-50' : 'dark:bg-blue-900/30'} text-blue-600 ${isFuture ? 'dark:text-blue-600' : 'dark:text-blue-400'} border-blue-200 ${isFuture ? 'dark:border-blue-200' : 'dark:border-blue-800'} font-black`
                            : mode === 'CLOSE TO OPEN'
                                ? `bg-amber-100 ${isFuture ? 'dark:bg-amber-100' : 'dark:bg-amber-900/50'} text-amber-800 ${isFuture ? 'dark:text-amber-800' : 'dark:text-amber-200'} border-amber-200 ${isFuture ? 'dark:border-amber-200' : 'dark:border-amber-800'}`
                                : `bg-emerald-50 ${isFuture ? 'dark:bg-emerald-50' : 'dark:bg-emerald-900/30'} text-emerald-600 ${isFuture ? 'dark:text-emerald-600' : 'dark:text-emerald-400'} border-emerald-200 ${isFuture ? 'dark:border-emerald-200' : 'dark:border-emerald-800'} font-black`;

                        return (
                          <td 
                              key={item.id} 
                              onClick={() => openRescheduleModal(item)}
                              className={cellClasses}
                              style={{
                                width: `calc((100% - ${isDesktop ? 140 : MOBILE_REACTOR_COL}px) / ${config.columnsToDisplay})`,
                                minWidth: `${isDesktop ? 130 : MOBILE_CELL_MIN}px`,
                              }}
                          >
                            <div className="h-full flex flex-col justify-between p-1">
                              
                              {/* Top Row: Batch, Date, Grade */}
                              <div className="flex justify-between items-start mb-0.5 relative">
                                <div className="flex flex-col leading-none z-10 relative">
                                   {isSkipped ? (
                                         <div className={`font-black px-1 py-0.5 rounded leading-none ${reactor.color} ${reactor.textColor} border border-white/20 shadow-sm`} style={{ fontSize: '0.85em' }}>
                                             RE-{reactor.id}
                                         </div>
                                   ) : (
                                         <span className={`font-bold font-mono ${isActive ? 'text-white' : (reactor.id === 'S' || reactor.id === 'T' ? (isFuture ? 'text-red-600 dark:text-red-600' : 'text-red-600 dark:text-red-400') : (isFuture ? 'text-red-500 dark:text-red-500' : 'text-red-500 dark:text-red-400'))} ${isPast ? '!text-inherit' : ''}`} style={{ fontSize: '1.0em' }}>
                                             <span className="opacity-50 text-[0.5em] mr-0.5">#</span>{item.batchNumber}
                                         </span>
                                   )}
                                </div>
                                
                                {/* Centered Note Indicator */}
                                {item.config?.note && (
                                    <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none z-20">
                                        <div className="flex items-center gap-0.5 bg-red-600 animate-pulse px-1.5 py-0.5 rounded shadow-md border border-white/50">
                                            <FileText className="w-3.5 h-3.5 text-white" />
                                            <span className="text-[0.75em] text-white font-black leading-none uppercase tracking-tighter whitespace-nowrap">CEK NOTE</span>
                                        </div>
                                    </div>
                                )}

                                <div className="text-right z-10">
                                  <div className={`font-black px-1.5 py-0.5 rounded leading-none ${isActive ? 'bg-white text-red-600' : (isSkipped ? 'bg-stone-300 dark:bg-stone-800 text-stone-600 dark:text-stone-400' : `${GRADE_COLORS[item.grade] || 'bg-slate-200'} text-white`)}`} style={{ fontSize: '0.9em' }}>
                                      {item.grade}
                                  </div>
                                </div>
                              </div>

                              {/* Middle: Start Time & Badges */}
                              <div className="text-center relative flex flex-col items-center justify-center flex-1 my-1">
                                {isSkipped ? (
                                  skipReason === 'MAINTENANCE' ? (
                                    <div className="flex flex-col items-center justify-center w-full h-full p-0 overflow-hidden">
                                        <svg 
                                          className="w-full h-auto text-red-500 dark:text-red-500 font-sans p-1" 
                                          viewBox="0 0 150 45" 
                                          preserveAspectRatio="xMidYMid meet"
                                        >
                                            <text 
                                              x="50%" 
                                              y="50%" 
                                              dominantBaseline="central" 
                                              textAnchor="middle" 
                                              className="font-black uppercase" 
                                              fill="currentColor"
                                              fontSize="18.5"
                                              letterSpacing="-0.8"
                                              textLength="142"
                                              lengthAdjust="spacingAndGlyphs"
                                            >
                                                {displaySkipText}
                                            </text>
                                        </svg>
                                    </div>
                                  ) : (skipReason === 'CLEANING_ROBOT' || skipReason === 'ABNORMAL_REAKSI' || skipReason === 'POISON_CHARGE' || displaySkipText.includes(' ')) ? (
                                    <div className="flex flex-col items-center justify-center w-full h-full p-0">
                                      <div 
                                        className="flex flex-col items-center justify-center font-black uppercase text-center leading-[1.0] text-red-500 max-w-full px-1 tracking-tight" 
                                        style={{ 
                                          fontSize: 
                                            config.columnsToDisplay <= 1 ? '3.2em' :
                                            config.columnsToDisplay === 2 ? '2.7em' :
                                            config.columnsToDisplay === 3 ? '2.2em' :
                                            config.columnsToDisplay === 4 ? '1.8em' :
                                            config.columnsToDisplay === 5 ? '1.5em' :
                                            config.columnsToDisplay === 6 ? '1.3em' :
                                            config.columnsToDisplay === 7 ? '1.1em' :
                                            config.columnsToDisplay === 8 ? '0.95em' :
                                            config.columnsToDisplay === 9 ? '0.85em' : '0.75em'
                                        }}
                                      >
                                        {displaySkipText.split(' ').map((word, idx) => (
                                          <span key={idx} className="block whitespace-nowrap">{word}</span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center w-full h-full p-0">
                                        <span 
                                          className="font-black uppercase text-center leading-tight text-red-500 max-w-full px-1 whitespace-normal tracking-tight" 
                                          style={{ 
                                            fontSize: displaySkipText.length <= 4 ? '1.8em' : displaySkipText.length <= 10 ? '1.3em' : '1.1em', 
                                            wordBreak: 'normal', 
                                            overflowWrap: 'break-word'
                                          }}
                                        >
                                            {displaySkipText}
                                        </span>
                                    </div>
                                  )
                                ) : (
                                  <>
                                      {/* Date above time */}
                                      <span className={`font-bold ${isActive || isPast ? 'text-white/90' : (isFuture ? 'text-slate-500 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400')}`} style={{ fontSize: '0.85em' }}>
                                          {formatDate(getBatchDate(item.startTime))}
                                      </span>
                                      
                                      {/* Unified Time Display - Significantly Larger */}
                                      <div className={`font-black tracking-tighter leading-none ${isActive ? 'text-white scale-105' : (isPast ? 'text-white line-through' : 'text-slate-900 dark:text-black')} transition-transform`} style={{ fontSize: '2.0em' }}>
                                          {formatTime(item.startTime)}
                                      </div>
                                      
                                      {/* Status / Badges */}
                                      {isPast ? (
                                          <div className="font-black text-white uppercase tracking-widest mt-1" style={{ fontSize: '0.7em' }}>
                                              SUDAH START
                                          </div>
                                      ) : isActive ? (
                                          <div className="font-black text-yellow-300 uppercase tracking-widest animate-bounce mt-1" style={{ fontSize: '0.8em' }}>
                                              START NOW
                                          </div>
                                      ) : null}
                                      
                                      <div className="flex justify-center gap-1 mt-1 flex-wrap w-full items-center">
                                          {/* Adjusted Time Delta Badge (HH:MM) */}
                                          {item.deltaMinutes !== 0 && (
                                              <div className={`font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 ${item.deltaMinutes > 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-cyan-100 text-cyan-800'}`} style={{ fontSize: '0.7em' }}>
                                                  {formatDelay(item.deltaMinutes)}
                                              </div>
                                          )}
                                          {/* Mode Badge - Visible for Open/Close Status */}
                                          <div className={`font-bold px-1.5 py-0.5 rounded uppercase border flex items-center gap-1 ${modeBadgeClasses}`} style={{ fontSize: '0.7em' }}>
                                              <span className="text-[0.5em] opacity-70 mr-0.5">MODE</span>
                                              {mode}
                                          </div>
                                          {/* Shift Indicator */}
                                          {item.config?.shiftSubsequent && (
                                              <div className="font-bold bg-orange-100 text-orange-700 px-1 py-0.5 rounded uppercase border border-orange-200 flex items-center" style={{ fontSize: '0.5em' }}>
                                                  <ArrowRightCircle className="w-[1em] h-[1em]" />
                                              </div>
                                          )}
                                      </div>
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
                              <div className={`mt-auto flex justify-between items-end border-t pt-1 ${isActive ? 'border-white/30' : (isFuture ? 'border-black/5 dark:border-black/5' : 'border-black/5 dark:border-white/10')} min-h-[20px]`}>
                                  <div className="flex gap-1 items-center shrink-0">
                                  </div>
                                  
                                  {stageInfo && (
                                      <div className="flex-1 mx-1 self-center bg-yellow-400 text-black font-black text-center animate-pulse rounded px-1 uppercase tracking-tighter border-2 border-red-600 shadow-sm overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: '0.7em' }}>
                                          {stageInfo}
                                      </div>
                                  )}
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

          {/* RIGHT SIDE: 20% Widgets */}
          <div className="w-full lg:w-[20%] grid grid-cols-2 lg:flex lg:flex-col gap-2 lg:h-full">
              {renderGradeSelectionWidget()}
              {renderSiloWidget()}
              {renderSteamWidget()}
              {renderCatalystMiniWidget()}
          </div>
        </div>
    );
  };

  const renderConflictTimeline = () => {
    // 1. Flatten and filter items (include past items so it matches the main table)
    const allItems = (Object.values(scheduleMatrix).flat() as ScheduleItem[])
      .filter(item => item.status !== 'skipped');

    // 2. Determine start and end times based on the schedule and current time
    const timelineTimes = [now.getTime()];
    if (allItems.length > 0) {
        allItems.forEach(item => {
            timelineTimes.push(item.startTime.getTime());
            timelineTimes.push(item.startTime.getTime() + (config.batchDurationMinutes || 240) * 60000);
        });
    } else {
        timelineTimes.push(now.getTime() + 12 * 3600000);
    }

    const earliestTime = new Date(Math.min(...timelineTimes));
    const startTime = new Date(earliestTime);
    startTime.setMinutes(startTime.getMinutes() < 30 ? 0 : 30, 0, 0); // Round down to nearest 30

    const latestTime = new Date(Math.max(...timelineTimes));

    const totalMinutesNeeded = (latestTime.getTime() - startTime.getTime()) / 60000;
    // Calculate how many 30-min slots we need. Minimum 24 slots (12 hours).
    const slotsCount = Math.max(24, Math.ceil(totalMinutesNeeded / 30));
    
    const slots = Array.from({ length: slotsCount }).map((_, i) => addMinutes(startTime, i * 30));
    const totalMinutes = slotsCount * 30;
    
    // 3. Current time position (%)
    const nowMinutes = (now.getTime() - startTime.getTime()) / 60000;
    const nowPos = (nowMinutes / totalMinutes) * 100;

    return (
      <div className="flex flex-col shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-xl text-white">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Reaktor Cycle Timeline</h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isUserScrollingTimeline && (
              <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 animate-pulse hidden sm:inline-block">
                Mode Scroll Manual (Kembali Otomatis ke Live)
              </span>
            )}
            <button
              onClick={() => {
                if (scrollInactivityTimerRef.current) clearTimeout(scrollInactivityTimerRef.current);
                setIsUserScrollingTimeline(false);
                scrollToNowPosition(true);
              }}
              className="px-2.5 py-1 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black text-[10px] rounded-lg shadow-sm flex items-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer"
              title="Fokuskan tampilan ke posisi jam saat ini (NOW)"
            >
              <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
              FOKUS LIVE NOW
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Conflict</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Scheduled</span>
            </div>
          </div>
        </div>

        <div className="p-0 overflow-x-auto scroll-smooth" ref={cycleTimelineContainerRef} onScroll={handleTimelineScroll}>
          <div className="relative inline-block min-w-full">
            {/* Current Time Indicator Line */}
            {nowPos >= 0 && nowPos <= 100 && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                style={{ left: `calc(80px + (100% - 80px) * ${nowPos / 100})` }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md flex items-center gap-1 whitespace-nowrap z-40 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  NOW ({formatTime(now)})
                </div>
              </div>
            )}

            <table className="w-full border-collapse table-fixed" style={{ minWidth: `${Math.max(1200, slotsCount * 60 + 80)}px` }}>
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="sticky left-0 z-40 bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-800 p-2 text-slate-500 uppercase tracking-wider text-[0.6em] font-black w-20">
                  REAKTOR
                </th>
                {slots.map((slot, i) => (
                  <th key={i} className="border-b border-slate-200 dark:border-slate-800 p-1 text-slate-500 uppercase tracking-wider text-[0.7em] font-black w-[48px]">
                    {formatTime(slot)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REACTORS.map((reactor) => (
                <tr key={reactor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="sticky left-0 z-40 bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800 p-2 font-black text-[0.75em] text-slate-700 dark:text-slate-300 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${reactor.color}`}></div>
                      {reactor.label}
                    </div>
                  </td>
                  <td colSpan={slotsCount} className="border-b border-slate-100 dark:border-slate-800 p-0 relative h-12">
                    {/* Grid lines for the row */}
                    <div className="absolute inset-0 flex">
                      {slots.map((_, i) => (
                        <div key={i} className="flex-1 border-r border-slate-100 dark:border-slate-800/30 last:border-0"></div>
                      ))}
                    </div>

                    {/* Batch Bars */}
                    {allItems
                      .filter(item => item.reactorId === reactor.id)
                      .map(item => {
                        const itemStartMinutes = (item.startTime.getTime() - startTime.getTime()) / 60000;
                        const duration = config.batchDurationMinutes || 240;
                        
                        const left = (itemStartMinutes / totalMinutes) * 100;
                        const width = (duration / totalMinutes) * 100;

                        if (left + width < 0 || left > 100) return null;

                        const actualLeft = Math.max(0, left);
                        const actualRight = Math.min(100, left + width);
                        const actualWidth = actualRight - actualLeft;

                        // Conflict detection
                        const isConflict = allItems.some(other => 
                          other.id !== item.id && 
                          Math.abs(other.startTime.getTime() - item.startTime.getTime()) < 10 * 60000
                        );

                        return (
                          <div 
                            key={item.id}
                            className={`absolute top-1 bottom-1 rounded-lg flex flex-col items-center justify-center text-[0.65em] font-black text-white shadow-lg z-10 transition-all hover:scale-[1.02] hover:z-20 border border-white/20 ${GRADE_COLORS[item.grade] || 'bg-slate-500'}`}
                            style={{ 
                              left: `${actualLeft}%`, 
                              width: `${actualWidth}%`,
                              ...(isConflict ? {
                                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.1) 10px, transparent 10px, transparent 20px)',
                                boxShadow: '0 0 0 2px #ef4444, 0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                              } : {})
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="bg-black/20 px-1 rounded">#{item.batchNumber}</span>
                              <span>{item.grade}</span>
                            </div>
                            <div className="text-[0.8em] opacity-90 mt-0.5">
                              {formatTime(item.startTime)}
                            </div>
                          </div>
                        );
                      })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">
              Full Schedule View
            </div>
            <div className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
              Live
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCatalyst = () => {
      if (currentView !== 'scheduler') return null;

      const cycleTimeInputClass = 'cycle-time-input appearance-none min-w-0 h-[2.3em] px-0.5 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 outline-none w-full text-center font-black text-[1.15em] leading-none rounded focus:ring-2 focus:ring-blue-500/30 transition-all shadow-sm tabular-nums';

      return (
           <div className="flex flex-col gap-4" style={{ fontSize: `${config.tableFontSize}px` }}>
                
               {/* Hitung Cycle Time & Kesepakatan Shift disembunyikan di HP:
                   keduanya tabel lebar yang tidak terbaca di layar sempit. */}
               <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-2 xl:gap-4">
                   {/* 1. CYCLE TIME WIDGET */}
                   <div className="flex min-w-0 flex-col overflow-hidden shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cycle-time-container">
                        <div className={`${GRADE_COLORS[config.currentGrade] || 'bg-indigo-600'} text-white font-bold text-[0.7em] px-2 py-0.5 text-center rounded-t-xl flex items-center justify-center gap-1.5 uppercase tracking-tight transition-colors`}>
                            <Calculator className="w-3 h-3" />
                            HITUNG CYCLE TIME
                        </div>
                        <div className={`${GRADE_COLORS[config.currentGrade] ? GRADE_COLORS[config.currentGrade].replace('bg-', 'bg-').concat('/10') : 'bg-white dark:bg-slate-800'} min-w-0 rounded-b-xl p-1 flex flex-col gap-1 transition-colors`}>
                            <table
                              className="cycle-time-table w-full table-fixed border-collapse text-center font-bold"
                              style={{
                                '--cycle-time-font-max': `${Math.max(15, Math.min(config.tableFontSize * 1.1, 26))}px`,
                              } as React.CSSProperties}
                            >
                                <thead>
                                    <tr>
                                        <th className="cycle-time-header border-b-2 border-slate-200 dark:border-slate-700 px-0.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[0.75em] leading-tight">NS START</th>
                                        <th className="cycle-time-header border-b-2 border-slate-200 dark:border-slate-700 px-0.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[0.75em] leading-tight">READY BLOWING</th>
                                        <th className="cycle-time-header border-b-2 border-slate-200 dark:border-slate-700 px-0.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[0.75em] leading-tight">BLOWING START</th>
                                        <th className="cycle-time-header border-b-2 border-slate-200 dark:border-slate-700 px-0.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[0.75em] leading-tight">BLOWING HOLD</th>
                                        <th className="cycle-time-header border-b-2 border-slate-200 dark:border-slate-700 px-0.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[0.75em] leading-tight">BLOWING COMPLETE</th>
                                        <th 
                                            className="cycle-time-header border-b-2 border-slate-200 dark:border-slate-700 px-0.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[0.75em] leading-tight cursor-pointer hover:text-blue-500 transition-colors"
                                            onClick={() => {
                                                setTempFormula(demonomerData.cycleTimeFormula);
                                                setIsFormulaModalOpen(true);
                                            }}
                                            title="Click to edit formula"
                                        >
                                            CYCLE TIME
                                        </th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {cycleTimeData.map((row) => {
                                        const blowingHold = calculateBlowingHold(row.readyBlowing, row.blowing);
                                        
                                        // Calculate Cycle Time using dynamic formula
                                        let cycleTime = '';
                                        if (row.blowingComplete && row.ns && blowingHold) {
                                            const totalDuration = calculateDuration(row.ns, row.blowingComplete);
                                            if (totalDuration) {
                                                const [tdH, tdM] = totalDuration.split(':').map(Number);
                                                const [bhH, bhM] = blowingHold.split(':').map(Number);
                                                
                                                const totalMins = (tdH * 60 + tdM);
                                                const holdMins = (bhH * 60 + bhM);
                                                
                                                const resultMins = evaluateMath(demonomerData.cycleTimeFormula, {
                                                    COMP: totalMins,
                                                    HOLD: holdMins
                                                });

                                                if (resultMins >= 0) {
                                                    cycleTime = `${Math.floor(resultMins / 60).toString().padStart(2, '0')}:${(Math.round(resultMins % 60)).toString().padStart(2, '0')}`;
                                                }
                                            }
                                        }

                                        return (
                                            <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-[2px]">
                                                    <input 
                                                        type="time" 
                                                        className={cycleTimeInputClass}
                                                        value={row.ns} 
                                                        onChange={(e) => handleCycleTimeChange(row.id, 'ns', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-[2px]">
                                                    <input 
                                                        type="time" 
                                                        className={cycleTimeInputClass}
                                                        value={row.readyBlowing} 
                                                        onChange={(e) => handleCycleTimeChange(row.id, 'readyBlowing', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-[2px]">
                                                    <input 
                                                        type="time" 
                                                        className={`${cycleTimeInputClass} !bg-green-50 dark:!bg-green-900/20 !text-green-900 dark:!text-green-100 focus:!ring-green-500/50`}
                                                        value={row.blowing} 
                                                        onChange={(e) => handleCycleTimeChange(row.id, 'blowing', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-[2px]">
                                                    <div className="h-[2.3em] bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 w-full text-center font-bold text-[1.1em] leading-none rounded flex items-center justify-center tabular-nums">
                                                        {blowingHold || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-[2px]">
                                                    <input 
                                                        type="time" 
                                                        className={cycleTimeInputClass}
                                                        value={row.blowingComplete} 
                                                        onChange={(e) => handleCycleTimeChange(row.id, 'blowingComplete', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-[2px]">
                                                    <div className="h-[2.3em] bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 w-full text-center font-black text-[1.55em] leading-none rounded border border-red-500/20 flex items-center justify-center tabular-nums">
                                                        {cycleTime || '-'}
                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="flex justify-end mt-0.5">
                                <button 
                                    onClick={() => {
                                        if (window.confirm("Apakah Anda yakin ingin mengosongkan semua data cycle time?")) {
                                            const clearedData = [
                                                { id: 1, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' },
                                                { id: 2, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' },
                                                { id: 3, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' },
                                                { id: 4, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' },
                                                { id: 5, ns: '', readyBlowing: '', blowing: '', blowingComplete: '' }
                                            ];
                                            lastCycleTimeUpdateRef.current = Date.now();
                                            setCycleTimeData(clearedData);
                                            updateGlobalSetting({ cycle_time_data: clearedData });
                                        }
                                    }}
                                    className="px-3 py-1 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold rounded-md border border-dashed border-red-300 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-1 text-[0.75em]"
                                    title="Kosongkan semua data cycle time"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    CLEAR DATA
                                </button>
                            </div>

                        </div>
                   </div>

                   {/* 2. KESEPAKATAN WIDGET */}
                   <Kesepakatan
                      currentGrade={activeDemonomerGrade}
                      shiftGroups={getShiftGroupsNow(now)}
                   />
               </div>

               {/* 3. CONFLICT TIMELINE TABLE */}
               {renderConflictTimeline()}
           </div>
      );
  };

  const renderSection = (sectionId: string, index: number) => {
      let content;
      switch(sectionId) {
          case 'header': content = renderHeader(); break;
          case 'scheduler': content = renderScheduler(); break;
          case 'catalyst': content = renderCatalyst(); break;
          case 'demonomer': content = (
            <Demonomer 
                currentGrade={config.gradeMode === 'normal' ? config.currentGrade : demonomerGrade} 
                onGradeChange={(g) => {
                    if (config.gradeMode === 'normal') {
                        handleConfigChange('currentGrade', g);
                    } else {
                        setDemonomerGrade(g);
                    }
                }}
                data={demonomerData}
                onDataChange={handleDemonomerChange}
                gradeMode={config.gradeMode}
                onGradeModeChange={(m) => {
                    if (m === 'gradeChange') {
                        openGradeChangeModal();
                    } else {
                        handleConfigChange('gradeMode', 'normal');
                    }
                }}
                onOpenFieTrend={() => setIsFie2002TrendOpen(true)}
            />
          ); break;
          case 'silo': content = (
            <Silo 
                activeSilo={siloState.activeSilo}
                silos={siloState.silos}
                onDataChange={handleSiloDataChange}
                onSiloSelect={handleSiloSwitch}
            />
          ); break;
          default: content = null;
      }

      if (!content) return null;

      return <div key={sectionId} className={sectionId === 'scheduler' && currentView === 'scheduler' ? 'h-full' : ''}>{content}</div>;
  };

  return (
    <div 
        className={`bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-sm relative transition-colors duration-300 ${config.theme}`}
        /* min-height dibagi zoomLevel: `zoom` ikut mengecilkan 100vh, sehingga
           min-h-screen menyisakan pita kosong di bawah saat zoom < 1. */
        style={{
            /* Zoom pilihan user hanya untuk layar besar. Di HP zoom < 1 membuat
               teks tak terbaca, jadi dipaksa 1. */
            zoom: isDesktop ? zoomLevel : 1,
            minHeight: `${100 / (isDesktop ? zoomLevel : 1)}vh`,
        }}
    >
      
      {/* ... [Full Screen Alert Overlay with Multi-Style Support] ... */}
      {((fullScreenAlertItem && !dismissedAlerts.has(fullScreenAlertItem.id)) || testAlertStyle !== null) && (() => {
          const isTesting = testAlertStyle !== null;
          const alertStyle = testAlertStyle || config.alertStyle || 'classic';
          const activeItem = isTesting ? {
              id: 'test-alert-item',
              reactorId: 'A',
              batchNumber: config.baseBatchNumber || 5165,
              startTime: new Date(now.getTime() + 45000),
              isToday: true,
              status: 'future' as const,
              grade: 'SM' as GradeType,
              deltaMinutes: 0
          } : fullScreenAlertItem;

          if (!activeItem) return null;

          const reactorObj = REACTORS.find(r => r.id === activeItem.reactorId);
          const secondsLeft = Math.max(0, Math.ceil((activeItem.startTime.getTime() - now.getTime()) / 1000));

          const handleDismiss = () => {
              if (isTesting) {
                  setTestAlertStyle(null);
                  setIsSettingsOpen(true);
              } else {
                  setDismissedAlerts(prev => new Set(prev).add(activeItem.id));
              }
          };

          return (
              <div className="fixed inset-0 z-[9999] overflow-hidden select-none">
                  {/* Top Control Floating Header in Test Preview Mode */}
                  {isTesting && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider flex items-center gap-3 shadow-2xl border-2 border-black z-[10000]">
                          <Eye className="w-4 h-4 text-black shrink-0" />
                          <span className="whitespace-nowrap">MODE TEST PREVIEW: {alertStyle.toUpperCase()}</span>
                          <button 
                              onClick={() => playAlarmSound(config.alarmSound)}
                              className="px-2.5 py-1 bg-slate-900 text-amber-300 hover:bg-slate-800 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap cursor-pointer"
                          >
                              🔊 TES SUARA
                          </button>
                          <button 
                              onClick={() => {
                                  handleConfigChange('alertStyle', alertStyle);
                                  setTestAlertStyle(null);
                                  setIsSettingsOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap cursor-pointer"
                          >
                              ✓ APPLIKASIKAN GAYA INI
                          </button>
                          <button 
                              onClick={() => {
                                  setTestAlertStyle(null);
                                  setIsSettingsOpen(true);
                              }}
                              className="px-2.5 py-1 bg-red-700 text-white hover:bg-red-800 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap cursor-pointer"
                          >
                              ✕ TUTUP PREVIEW
                          </button>
                      </div>
                  )}

                  {/* STYLE 1: CLASSIC (Klasik Warna Reaktor) */}
                  {alertStyle === 'classic' && (
                      <div className={`w-full h-full flex flex-col items-center justify-center text-white animate-in fade-in duration-300 ${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} p-6 text-center relative`}>
                          <button 
                              onClick={handleDismiss}
                              className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/40 rounded-full transition-colors backdrop-blur-sm group z-10"
                              title="Tutup Alert"
                          >
                              <X className="w-8 h-8 opacity-80 group-hover:opacity-100" />
                          </button>
                          <div className="animate-pulse flex flex-col items-center my-auto max-w-2xl w-full">
                              <AlertTriangle className={`w-24 h-24 mb-3 ${reactorObj?.id === 'U' ? 'text-black' : 'text-yellow-300'}`} />
                              <h2 className="text-xl sm:text-2xl font-black tracking-widest uppercase mb-4 bg-black/30 px-8 py-2 rounded-full border border-white/30 text-yellow-300 shadow-lg">
                                  SEGERA START REAKTOR {activeItem.reactorId}
                              </h2>
                              
                              {/* KOTAK REAKTOR DENGAN WARNA BACKGROUND TABEL CYCLE */}
                              <div className={`${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} px-12 py-8 rounded-3xl shadow-2xl flex flex-col items-center mb-6 border-4 border-white/80 min-w-[320px] sm:min-w-[420px]`}>
                                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-80">REAKTOR</span>
                                  <span className="text-[100px] sm:text-[130px] leading-none font-black tracking-tight my-1 drop-shadow-2xl">
                                      {activeItem.reactorId}
                                  </span>
                              </div>

                              <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-6 bg-black/40 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/30 w-full">
                                  <div className="flex flex-col items-center">
                                      <span className="text-xs font-bold uppercase tracking-widest text-yellow-300">NO BATCH</span>
                                      <span className="text-3xl sm:text-4xl font-mono font-black text-white">#{activeItem.batchNumber}</span>
                                  </div>
                                  <div className="w-0.5 h-10 bg-white/30 my-auto"></div>
                                  <div className="flex flex-col items-center">
                                      <span className="text-xs font-bold uppercase tracking-widest text-yellow-300">JAM START</span>
                                      <span className="text-3xl sm:text-4xl font-mono font-black text-white">{formatTime(activeItem.startTime)}</span>
                                  </div>
                              </div>

                              <div className={`text-2xl font-black animate-bounce px-8 py-3 rounded-full mb-6 shadow-2xl ${reactorObj?.id === 'U' ? 'bg-black/40 text-yellow-300 border-2 border-yellow-300' : 'text-yellow-300 bg-black/60 border-2 border-yellow-300'}`}>
                                  ⏳ SISA WAKTU: {secondsLeft} DETIK
                              </div>

                              <button 
                                  onClick={handleDismiss}
                                  className="px-8 py-3.5 bg-white text-slate-900 rounded-full font-black hover:bg-slate-100 transition-all shadow-xl flex items-center gap-2 transform hover:scale-105 active:scale-95 text-sm uppercase tracking-wider"
                              >
                                  <X className="w-5 h-5" /> {isTesting ? 'TUTUP PREVIEW' : 'MATIKAN ALARM'}
                              </button>
                          </div>
                      </div>
                  )}

                  {/* STYLE 2: NEON CYBER HAZARD */}
                  {alertStyle === 'neon' && (
                      <div className="w-full h-full flex flex-col justify-between items-center bg-slate-950 text-amber-300 font-mono animate-in fade-in duration-300 border-[12px] border-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.6)] relative p-0">
                          <button 
                              onClick={handleDismiss}
                              className="absolute top-8 right-8 p-3 bg-amber-400 text-black hover:bg-amber-300 rounded-full transition-all shadow-lg z-20"
                              title="Tutup Alert"
                          >
                              <X className="w-8 h-8 font-black" />
                          </button>
                          <div className="w-full bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_20px,#000_20px,#000_40px)] py-3 text-center text-black font-extrabold text-sm uppercase tracking-widest border-b-2 border-amber-400">
                              ⚡ PERINTAH CYBER CONTROL: SIAPKAN OPERASI START REAKTOR ⚡
                          </div>

                          <div className="flex flex-col items-center my-auto p-6 text-center max-w-2xl w-full">
                              <div className="flex items-center gap-2 text-amber-400 mb-2 animate-pulse">
                                  <Sparkles className="w-8 h-8 text-amber-400" />
                                  <span className="text-lg font-black uppercase tracking-widest">PERINTAH UTAMA START</span>
                              </div>
                              <h1 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wider mb-4 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">
                                  SEGERA START REAKTOR {activeItem.reactorId}
                              </h1>

                              {/* KOTAK REAKTOR DENGAN WARNA BACKGROUND TABEL CYCLE */}
                              <div className={`${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} border-4 border-amber-400 rounded-3xl p-8 shadow-[0_0_50px_rgba(251,191,36,0.5)] my-2 flex flex-col items-center w-full`}>
                                  <span className="text-xs font-bold tracking-widest uppercase opacity-90">REAKTOR</span>
                                  <span className="text-8xl sm:text-9xl font-black my-2 drop-shadow-2xl">{activeItem.reactorId}</span>
                              </div>

                              <div className="flex justify-around items-center w-full bg-slate-900 border-2 border-amber-400 rounded-2xl p-4 my-4 text-cyan-300 font-bold text-lg sm:text-2xl shadow-inner">
                                  <span>NO BATCH: #{activeItem.batchNumber}</span>
                                  <span className="opacity-40">|</span>
                                  <span>JAM START: {formatTime(activeItem.startTime)}</span>
                              </div>

                              <div className="mt-2 bg-cyan-950/90 border-2 border-cyan-400 text-cyan-300 px-8 py-3 rounded-xl font-mono font-extrabold text-2xl shadow-[0_0_30px_rgba(34,211,238,0.5)] animate-pulse mb-6">
                                  ⏳ SISA WAKTU: {secondsLeft} DETIK
                              </div>

                              <button 
                                  onClick={handleDismiss}
                                  className="px-8 py-3 bg-amber-400 text-slate-950 font-black text-sm rounded-xl hover:bg-amber-300 transition-all shadow-[0_0_20px_rgba(251,191,36,0.6)] flex items-center gap-2 uppercase tracking-wider"
                              >
                                  <X className="w-5 h-5" /> {isTesting ? 'TUTUP PREVIEW' : 'DISMISS ALERT'}
                              </button>
                          </div>

                          <div className="w-full bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_20px,#000_20px,#000_40px)] py-3 text-center text-black font-extrabold text-sm uppercase tracking-widest border-t-2 border-amber-400">
                              ⚡ PERINTAH CYBER CONTROL: SIAPKAN OPERASI START REAKTOR ⚡
                          </div>
                      </div>
                  )}

                  {/* STYLE 3: EMERGENCY STROBE & SIRENS */}
                  {alertStyle === 'emergency' && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-red-950 text-white animate-pulse transition-colors p-6 text-center relative">
                          <button 
                              onClick={handleDismiss}
                              className="absolute top-6 right-6 p-3 bg-yellow-400 text-black hover:bg-yellow-300 rounded-full transition-colors shadow-2xl z-10"
                              title="Tutup Alert"
                          >
                              <X className="w-8 h-8 font-black" />
                          </button>
                          
                          <div className="flex justify-between w-full max-w-4xl absolute top-8 px-12 pointer-events-none">
                              <Bell className="w-16 h-16 text-yellow-300 animate-bounce" />
                              <Bell className="w-16 h-16 text-yellow-300 animate-bounce" />
                          </div>

                          <div className="flex flex-col items-center my-auto max-w-2xl w-full">
                              <AlertTriangle className="w-24 h-24 text-yellow-300 mb-2 animate-ping" />
                              <p className="text-lg sm:text-2xl font-black text-yellow-300 uppercase tracking-widest mb-6">
                                  SEGERA START REAKTOR {activeItem.reactorId}
                              </p>

                              {/* KOTAK REAKTOR DENGAN WARNA BACKGROUND TABEL CYCLE */}
                              <div className={`${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} border-4 border-yellow-300 rounded-3xl p-8 shadow-2xl flex flex-col items-center w-full mb-6`}>
                                  <span className="text-xs font-black uppercase tracking-widest opacity-90">REAKTOR</span>
                                  <span className="text-8xl sm:text-9xl font-black my-1 drop-shadow-2xl">{activeItem.reactorId}</span>
                              </div>

                              <div className="flex justify-around items-center w-full bg-red-900 border-2 border-yellow-300 rounded-2xl p-4 mb-6 text-white font-mono text-xl font-black">
                                  <span>NO BATCH: #{activeItem.batchNumber}</span>
                                  <span className="opacity-40">|</span>
                                  <span>JAM START: {formatTime(activeItem.startTime)}</span>
                              </div>

                              <div className="bg-yellow-400 text-red-950 font-black text-2xl px-10 py-3.5 rounded-full border-4 border-white shadow-2xl mb-6 animate-bounce">
                                  ⏳ SISA WAKTU: {secondsLeft} DETIK
                              </div>

                              <button 
                                  onClick={handleDismiss}
                                  className="px-10 py-4 bg-white text-red-700 hover:bg-yellow-100 rounded-full font-black text-base transition-transform shadow-2xl flex items-center gap-3 transform active:scale-95 uppercase tracking-wider"
                              >
                                  <X className="w-6 h-6" /> {isTesting ? 'TUTUP PREVIEW' : 'MATIKAN SIRENE & ALARM'}
                              </button>
                          </div>
                      </div>
                  )}

                  {/* STYLE 4: MODERN GLASS HUD */}
                  {alertStyle === 'glass' && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-2xl text-slate-100 p-6 relative">
                          <button 
                              onClick={handleDismiss}
                              className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border border-white/20 backdrop-blur-md z-10"
                              title="Tutup Alert"
                          >
                              <X className="w-8 h-8" />
                          </button>

                          <div className="bg-slate-900/80 border border-white/20 rounded-3xl p-8 max-w-xl w-full flex flex-col items-center text-center shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative overflow-hidden my-auto">
                              <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-500/30 rounded-full blur-3xl pointer-events-none"></div>
                              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-amber-500/30 rounded-full blur-3xl pointer-events-none"></div>

                              <AlertTriangle className="w-16 h-16 text-amber-400 mb-2 animate-pulse" />
                              <span className="text-xs font-black uppercase tracking-widest text-blue-400 mb-1">PLANT COMMAND NOTIFICATION</span>
                              <h2 className="text-2xl font-extrabold text-white mb-4 tracking-tight uppercase">
                                  SEGERA START REAKTOR {activeItem.reactorId}
                              </h2>

                              {/* KOTAK REAKTOR DENGAN WARNA BACKGROUND TABEL CYCLE */}
                              <div className={`${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} px-8 py-6 rounded-3xl border-4 border-white/60 flex flex-col items-center justify-center mb-6 shadow-2xl w-full`}>
                                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">REAKTOR</span>
                                  <span className="text-7xl sm:text-8xl font-black mt-1">{activeItem.reactorId}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                                  <div>
                                      <span className="text-[11px] uppercase font-bold text-slate-400 block">No Batch</span>
                                      <span className="text-2xl font-mono font-bold text-white">#{activeItem.batchNumber}</span>
                                  </div>
                                  <div>
                                      <span className="text-[11px] uppercase font-bold text-slate-400 block">Jam Start</span>
                                      <span className="text-2xl font-mono font-bold text-white">{formatTime(activeItem.startTime)}</span>
                                  </div>
                              </div>

                              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg px-8 py-3 rounded-full shadow-lg mb-6 border border-white/20 animate-pulse">
                                  ⏳ SISA WAKTU: {secondsLeft} DETIK
                              </div>

                              <button 
                                  onClick={handleDismiss}
                                  className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-full font-bold text-sm transition-all flex items-center gap-2"
                              >
                                  <X className="w-4 h-4" /> {isTesting ? 'TUTUP PREVIEW' : 'MATIKAN ALARM'}
                              </button>
                          </div>
                      </div>
                  )}

                  {/* STYLE 5: INDUSTRIAL SAFETY GATE */}
                  {alertStyle === 'industrial' && (
                      <div className="w-full h-full flex flex-col justify-between items-center bg-slate-900 text-amber-400 p-0 relative">
                          <button 
                              onClick={handleDismiss}
                              className="absolute top-8 right-8 p-3 bg-amber-500 text-black hover:bg-amber-400 rounded-full transition-all border-2 border-black z-20"
                              title="Tutup Alert"
                          >
                              <X className="w-8 h-8 font-black" />
                          </button>

                          <div className="w-full h-14 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_25px,#000_25px,#000_50px)] border-b-4 border-amber-500 shadow-lg"></div>

                          <div className="flex flex-col items-center my-auto p-6 text-center max-w-2xl w-full">
                              <div className="bg-amber-500 text-black px-6 py-2 rounded-lg font-black text-base uppercase tracking-widest mb-4 flex items-center gap-2 shadow-2xl border-2 border-black">
                                  <Wrench className="w-5 h-5" /> SEGERA START REAKTOR {activeItem.reactorId}
                              </div>

                              {/* KOTAK REAKTOR DENGAN WARNA BACKGROUND TABEL CYCLE */}
                              <div className={`${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} border-4 border-amber-500 rounded-2xl p-8 shadow-2xl flex flex-col items-center w-full my-2`}>
                                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">REAKTOR</span>
                                  <span className="text-8xl sm:text-9xl font-black my-2">{activeItem.reactorId}</span>
                              </div>

                              <div className="flex justify-around items-center w-full bg-black border-2 border-amber-500 rounded-xl p-4 my-3 text-white font-mono text-xl font-black">
                                  <span>NO BATCH: #{activeItem.batchNumber}</span>
                                  <span className="opacity-40">|</span>
                                  <span>JAM START: {formatTime(activeItem.startTime)}</span>
                              </div>

                              <div className="mt-3 bg-amber-500 text-black font-black text-2xl px-10 py-3.5 rounded-xl border-4 border-black shadow-2xl animate-bounce mb-6">
                                  ⏳ SISA WAKTU: {secondsLeft} DETIK
                              </div>

                              <button 
                                  onClick={handleDismiss}
                                  className="px-8 py-3 bg-black text-amber-400 border-2 border-amber-500 font-black text-sm rounded-xl hover:bg-slate-800 transition-all shadow-xl flex items-center gap-2 uppercase tracking-wider"
                              >
                                  <X className="w-5 h-5" /> {isTesting ? 'TUTUP PREVIEW' : 'DISMISS SAFETY ALERT'}
                              </button>
                          </div>

                          <div className="w-full h-14 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_25px,#000_25px,#000_50px)] border-t-4 border-amber-500 shadow-lg"></div>
                      </div>
                  )}

                  {/* STYLE 6: HOLOGRAM SCI-FI CONSOLE */}
                  {alertStyle === 'holo' && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-cyan-300 p-6 relative font-sans overflow-hidden">
                          <button 
                              onClick={handleDismiss}
                              className="absolute top-8 right-8 p-3 bg-cyan-500/20 text-cyan-300 border border-cyan-400 hover:bg-cyan-500/40 rounded-full transition-all backdrop-blur-md z-20 shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                              title="Tutup Alert"
                          >
                              <X className="w-8 h-8 font-black" />
                          </button>

                          {/* Holographic Glowing Orbs */}
                          <div className="absolute w-[500px] h-[500px] rounded-full border border-cyan-500/20 animate-spin duration-10000 pointer-events-none"></div>
                          <div className="absolute w-[350px] h-[350px] rounded-full border-2 border-dashed border-cyan-400/40 animate-ping duration-3000 pointer-events-none"></div>

                          <div className="bg-slate-900/90 border-2 border-cyan-400/80 rounded-3xl p-8 max-w-xl w-full flex flex-col items-center text-center shadow-[0_0_80px_rgba(34,211,238,0.4)] backdrop-blur-3xl relative z-10 my-auto">
                              <Sparkles className="w-14 h-14 text-cyan-400 mb-2 animate-pulse" />
                              <div className="bg-cyan-950/80 text-cyan-300 border border-cyan-400 px-5 py-1.5 rounded-full font-black text-xs uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                                  SYSTEM COMMAND: EXECUTE OPERASI
                              </div>
                              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                                  SEGERA START REAKTOR {activeItem.reactorId}
                              </h1>

                              {/* KOTAK REAKTOR DENGAN WARNA BACKGROUND TABEL CYCLE */}
                              <div className={`${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} border-2 border-white/60 rounded-2xl p-6 w-full mb-6 shadow-2xl`}>
                                  <span className="text-xs font-bold uppercase tracking-widest block mb-1 opacity-80">REAKTOR</span>
                                  <span className="text-7xl sm:text-8xl font-black tracking-tight block">
                                      {activeItem.reactorId}
                                  </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 w-full bg-slate-950/80 border border-cyan-500/40 rounded-xl p-4 mb-6 text-left">
                                  <div className="border-r border-cyan-500/30 pr-2">
                                      <span className="text-[10px] font-extrabold text-cyan-400/80 uppercase block">NO BATCH</span>
                                      <span className="text-2xl font-mono font-black text-white">#{activeItem.batchNumber}</span>
                                  </div>
                                  <div className="pl-2">
                                      <span className="text-[10px] font-extrabold text-cyan-400/80 uppercase block">JAM START</span>
                                      <span className="text-2xl font-mono font-black text-white">{formatTime(activeItem.startTime)}</span>
                                  </div>
                              </div>

                              <div className="w-full bg-cyan-950/80 border border-cyan-400 text-cyan-300 py-3 rounded-xl font-mono font-black text-xl shadow-[0_0_25px_rgba(34,211,238,0.4)] animate-pulse mb-6">
                                  ⏳ SISA WAKTU: {secondsLeft} DETIK
                              </div>

                              <button 
                                  onClick={handleDismiss}
                                  className="px-8 py-3 bg-cyan-400 text-slate-950 font-black text-sm rounded-xl hover:bg-cyan-300 transition-all shadow-[0_0_30px_rgba(34,211,238,0.6)] flex items-center gap-2 uppercase tracking-wider"
                              >
                                  <X className="w-5 h-5" /> {isTesting ? 'TUTUP PREVIEW' : 'DISMISS HOLO ALERT'}
                              </button>
                          </div>
                      </div>
                  )}

                  {/* STYLE 7: TERMINAL MATRIX */}
                  {alertStyle === 'matrix' && (
                      <div className="w-full h-full flex flex-col justify-between items-center bg-black text-emerald-400 font-mono p-6 relative animate-in fade-in duration-300">
                          <button 
                              onClick={handleDismiss}
                              className="absolute top-8 right-8 p-3 bg-emerald-500 text-black hover:bg-emerald-400 rounded-full transition-all z-20"
                              title="Tutup Alert"
                          >
                              <X className="w-8 h-8 font-black" />
                          </button>

                          <div className="w-full text-left text-xs text-emerald-500 border-b border-emerald-800 pb-2 flex justify-between">
                              <span>[SYSTEM_CONTROL_PLANT_V2]</span>
                              <span className="animate-pulse">● ONLINE MONITORING</span>
                          </div>

                          <div className="flex flex-col items-center my-auto text-center max-w-2xl w-full">
                              <div className="text-sm font-bold text-emerald-300 border border-emerald-500 px-4 py-1 rounded mb-4 animate-pulse">
                                  [PERINTAH OPERATOR]: RUN START_SEQUENCE.EXE
                              </div>
                              <h1 className="text-2xl sm:text-3xl font-black text-emerald-300 uppercase tracking-tight mb-6">
                                  SEGERA START REAKTOR {activeItem.reactorId}
                              </h1>

                              {/* KOTAK REAKTOR DENGAN WARNA BACKGROUND TABEL CYCLE */}
                              <div className={`${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} border-2 border-emerald-400 p-8 rounded-2xl w-full mb-6 shadow-2xl`}>
                                  <span className="text-xs uppercase tracking-widest block mb-1 opacity-80">// REAKTOR</span>
                                  <span className="text-8xl sm:text-9xl font-black tracking-tight block">
                                      {activeItem.reactorId}
                                  </span>
                              </div>

                              <div className="flex justify-around items-center w-full bg-emerald-950/60 border border-emerald-500 rounded-xl p-4 mb-6 text-lg font-bold text-white">
                                  <span>NO BATCH: #{activeItem.batchNumber}</span>
                                  <span className="opacity-40">|</span>
                                  <span>JAM START: {formatTime(activeItem.startTime)}</span>
                              </div>

                              <div className="bg-emerald-900/60 text-emerald-200 border border-emerald-400 px-8 py-3 rounded-lg font-black text-2xl mb-6 animate-bounce">
                                  ⏳ SISA WAKTU: {secondsLeft} DETIK
                              </div>

                              <button 
                                  onClick={handleDismiss}
                                  className="px-8 py-3 bg-emerald-500 text-black font-black text-sm rounded hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(52,211,153,0.5)] flex items-center gap-2 uppercase"
                              >
                                  <X className="w-5 h-5" /> {isTesting ? 'TUTUP PREVIEW' : 'TERMINATE ALARM'}
                              </button>
                          </div>

                          <div className="w-full text-center text-xs text-emerald-600 border-t border-emerald-800 pt-2">
                              STATUS: REAKTOR_{activeItem.reactorId}_READY_FOR_START
                          </div>
                      </div>
                  )}

                  {/* STYLE 8: MINIMALIST BOLD */}
                  {alertStyle === 'minimal' && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center relative font-sans">
                          <button 
                              onClick={handleDismiss}
                              className="absolute top-8 right-8 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors border border-slate-700 z-10"
                              title="Tutup Alert"
                          >
                              <X className="w-8 h-8" />
                          </button>

                          <div className="flex flex-col items-center my-auto max-w-2xl w-full">
                              <span className="text-sm font-black tracking-widest uppercase text-amber-400 bg-amber-950/80 px-6 py-2 rounded-full border border-amber-500/50 mb-6">
                                  SEGERA START REAKTOR {activeItem.reactorId}
                              </span>

                              {/* KOTAK REAKTOR DENGAN WARNA BACKGROUND TABEL CYCLE */}
                              <div className={`${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} p-10 rounded-3xl w-full shadow-2xl mb-8 border-4 border-white/40`}>
                                  <span className="text-sm font-extrabold uppercase tracking-widest block mb-1 opacity-80">REAKTOR</span>
                                  <span className="text-[90px] sm:text-[120px] leading-none font-black tracking-tighter block my-2 drop-shadow-xl">
                                      {activeItem.reactorId}
                                  </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-center w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6">
                                  <div>
                                      <span className="text-xs font-bold text-slate-400 uppercase block">NO BATCH</span>
                                      <span className="text-2xl sm:text-3xl font-mono font-black text-white">#{activeItem.batchNumber}</span>
                                  </div>
                                  <div>
                                      <span className="text-xs font-bold text-slate-400 uppercase block">JAM START</span>
                                      <span className="text-2xl sm:text-3xl font-mono font-black text-white">{formatTime(activeItem.startTime)}</span>
                                  </div>
                              </div>

                              <div className="bg-amber-400 text-slate-950 font-black text-2xl sm:text-3xl px-10 py-3.5 rounded-2xl shadow-xl mb-8 animate-pulse">
                                  ⏳ SISA WAKTU: {secondsLeft} DETIK
                              </div>

                              <button 
                                  onClick={handleDismiss}
                                  className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-sm rounded-xl transition-all shadow-lg flex items-center gap-2 uppercase tracking-wider border border-slate-700"
                              >
                                  <X className="w-5 h-5" /> {isTesting ? 'TUTUP PREVIEW' : 'DISMISS ALERT'}
                              </button>
                          </div>
                      </div>
                  )}

                  {/* STYLE 9: CAUTION TAG HAZARD */}
                  {alertStyle === 'warning_stripe' && (
                      <div className="w-full h-full flex flex-col justify-between items-center bg-yellow-400 text-slate-950 p-0 relative font-sans border-[16px] border-black">
                          <button 
                              onClick={handleDismiss}
                              className="absolute top-8 right-8 p-3 bg-black text-yellow-400 hover:bg-slate-900 rounded-full transition-all shadow-2xl z-20"
                              title="Tutup Alert"
                          >
                              <X className="w-8 h-8 font-black" />
                          </button>

                          <div className="w-full bg-black text-yellow-400 py-3 text-center font-black text-base uppercase tracking-widest flex items-center justify-center gap-3">
                              <ShieldAlert className="w-6 h-6 animate-pulse text-red-500" />
                              ⚠️ SEGERA START REAKTOR {activeItem.reactorId} ⚠️
                              <ShieldAlert className="w-6 h-6 animate-pulse text-red-500" />
                          </div>

                          <div className="flex flex-col items-center my-auto p-6 text-center max-w-2xl w-full">
                              <div className="bg-black text-yellow-400 px-8 py-2.5 rounded-2xl font-black text-lg uppercase tracking-widest mb-6 border-2 border-yellow-500 shadow-2xl">
                                  SEGERA START REAKTOR {activeItem.reactorId}
                              </div>

                              {/* KOTAK REAKTOR DENGAN WARNA BACKGROUND TABEL CYCLE */}
                              <div className={`${reactorObj?.color || 'bg-red-600'} ${reactorObj?.textColor || 'text-white'} border-8 border-black rounded-3xl p-10 shadow-2xl flex flex-col items-center w-full mb-6`}>
                                  <span className="text-sm font-black uppercase tracking-widest opacity-80">REAKTOR</span>
                                  <span className="text-8xl sm:text-9xl font-black my-2 drop-shadow-2xl">{activeItem.reactorId}</span>
                              </div>

                              <div className="flex justify-around items-center w-full bg-black text-white rounded-2xl p-4 mb-6 font-mono text-xl sm:text-2xl font-black">
                                  <span className="text-yellow-400">NO BATCH: #{activeItem.batchNumber}</span>
                                  <span className="opacity-40">|</span>
                                  <span className="text-yellow-400">JAM START: {formatTime(activeItem.startTime)}</span>
                              </div>

                              <div className="bg-red-600 text-white font-black text-2xl sm:text-3xl px-10 py-4 rounded-2xl border-4 border-black shadow-2xl animate-bounce mb-6">
                                  ⏳ SISA WAKTU: {secondsLeft} DETIK
                              </div>

                              <button 
                                  onClick={handleDismiss}
                                  className="px-10 py-4 bg-black text-yellow-400 hover:bg-slate-900 font-black text-sm rounded-2xl transition-all shadow-2xl flex items-center gap-2 uppercase tracking-wider border-2 border-yellow-400"
                              >
                                  <X className="w-6 h-6" /> {isTesting ? 'TUTUP PREVIEW' : 'DISMISS CAUTION ALERT'}
                              </button>
                          </div>

                          <div className="w-full bg-black text-yellow-400 py-3 text-center font-black text-sm uppercase tracking-widest">
                              PERINGATAN SAFETY OPERASI PLANT CHEMICAL REAKTOR
                          </div>
                      </div>
                  )}
              </div>
          );
      })()}

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

      {/* Dynamic Layout Rendering */}
      <div className={`flex-1 flex flex-row min-h-0 gap-2 ${currentView === 'scheduler' ? 'overflow-auto lg:overflow-hidden p-1' : 'overflow-auto p-2'}`}>

          {/* Kolom kiri: header + konten. Sidebar jadi saudara kandungnya,
              bukan anak di bawah header, supaya tingginya sampai atas. */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${currentView === 'scheduler' ? 'gap-1' : 'gap-4'}`}>
              {/* Header */}
              {renderSection('header', 0)}

              <div
                className="flex-1 flex flex-col min-w-0 lg:min-h-0 lg:overflow-auto"
                /* Zoom 0.8 khusus tabel scheduler di desktop; di HP tabelnya
                   sudah diganti kartu, mengecilkannya lagi bikin tak terbaca. */
                style={isDesktop && currentView === 'scheduler' ? { zoom: 0.8 } : undefined}
              >
              {currentView === 'scheduler' && (
                  <>
                      <div className="flex-1 min-h-0">{renderSection('scheduler', 1)}</div>
                      {renderSection('catalyst', 2)}
                  </>
              )}

              {currentView === 'demonomer' && (
                <Demonomer 
                    currentGrade={config.gradeMode === 'normal' ? config.currentGrade : demonomerGrade} 
                    onGradeChange={(g) => {
                        if (config.gradeMode === 'normal') {
                            handleConfigChange('currentGrade', g);
                        } else {
                            setDemonomerGrade(g);
                        }
                    }}
                    data={demonomerData}
                    onDataChange={handleDemonomerChange}
                    gradeMode={config.gradeMode}
                    onGradeModeChange={(m) => handleConfigChange('gradeMode', m)}
                    onOpenFieTrend={() => setIsFie2002TrendOpen(true)}
                />
              )}

              {currentView === 'silo' && (
                <div className="silo-container">
                    <Silo 
                        activeSilo={siloState.activeSilo}
                        silos={siloState.silos}
                        onDataChange={handleSiloDataChange}
                        onSiloSelect={handleSiloSwitch}
                    />
                </div>
              )}

              {currentView === 'catatan' && (
                <Catatan onBack={() => setCurrentView('scheduler')} />
              )}

              {currentView === 'jadwalShift' && (
                <JadwalShift now={now} />
              )}

              {currentView === 'jadwal' && (
                <Jadwal key={currentGroup} activeGroup={currentGroup} />
              )}

              {currentView === 'kas' && (
                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-4 lg:p-6 min-h-[500px]">
                  <KasGrup key={currentGroup} activeGroup={currentGroup} />
                </div>
              )}

              {currentView === 'unitConverter' && (
                <UnitConverter />
              )}
              </div>
          </div>

          {/* Sidebar navigasi — satu-satunya tempat berpindah halaman.
              Saudara kandung kolom kiri, jadi tingginya penuh sampai atas. */}
          <Sidebar
                currentView={currentView}
                currentGroup={currentGroup}
                collapsed={sidebarCollapsed}
                onToggleCollapsed={() => setSidebarCollapsed(v => !v)}
                onSelectView={setCurrentView}
                onSelectGroup={handleSelectGroup}
                isSettingsOpen={isSettingsOpen}
                onToggleSettings={() => setIsSettingsOpen(o => !o)}
                isMobile={!isDesktop}
                mobileOpen={isMobileNavOpen}
            onMobileClose={() => setIsMobileNavOpen(false)}
          />
      </div>

      <div className="max-w-7xl mx-auto mt-6 pb-6 text-center text-slate-400 dark:text-slate-500 text-sm font-bold">
          2025 | SCHEDULE START PVC 5
      </div>

      {/* --- DEMONOMER POPUP (ADJUST STEAM) --- */}
      {isDemonomerPopupOpen && (
          <div className="fixed inset-0 pointer-events-none z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <DraggableModal className="w-full max-w-4xl flex flex-col max-h-[90vh]">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col ring-4 ring-teal-500/50">
                      <div className="bg-teal-600 text-white px-5 py-3.5 flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing">
                          <h3 className="text-sm sm:text-base font-black flex items-center gap-2 uppercase tracking-tight">
                              <Activity className="w-5 h-5 text-yellow-300 animate-pulse shrink-0" />
                              <span>ADJUST STEAM (DEMONOMER)</span>
                              <span className="hidden lg:inline px-2 py-0.5 text-[10px] bg-white/20 text-white font-bold rounded border border-white/30 select-none ml-1 whitespace-nowrap">
                                  ✋ Tahan &amp; Drag
                              </span>
                          </h3>
                          <button onClick={() => setIsDemonomerPopupOpen(false)} className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer" title="Tutup Adjust Steam">
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 sm:p-5 max-h-[78vh]">
                          <Demonomer 
                              currentGrade={config.gradeMode === 'normal' ? config.currentGrade : demonomerGrade} 
                              onGradeChange={(g) => {
                                  if (config.gradeMode === 'normal') {
                                      handleConfigChange('currentGrade', g);
                                  } else {
                                      setDemonomerGrade(g);
                                  }
                              }}
                              data={demonomerData}
                              onDataChange={handleDemonomerChange}
                              gradeMode={config.gradeMode}
                              onGradeModeChange={(m) => {
                                  if (m === 'gradeChange') {
                                      openGradeChangeModal();
                                  } else {
                                      handleConfigChange('gradeMode', 'normal');
                                  }
                              }}
                              onOpenFieTrend={() => setIsFie2002TrendOpen(true)}
                          />
                      </div>
                  </div>
              </DraggableModal>
          </div>
      )}

      {/* --- GRADE CHANGE CONFIRMATION MODAL --- */}
      {isGradeChangeModalOpen && (
          <div className="fixed inset-0 pointer-events-none z-[85] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <DraggableModal className="w-full max-w-lg">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all ring-4 ring-teal-500/50">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-5 flex items-center justify-between cursor-grab active:cursor-grabbing">
                          <div>
                              <h3 className="text-xl font-black flex items-center gap-2">
                                  <Activity className="w-6 h-6 text-yellow-300 animate-pulse" />
                                  KONFIRMASI GRADE CHANGE
                                  <span className="hidden lg:inline px-2 py-0.5 text-[10px] bg-white/20 text-white font-bold rounded border border-white/30 select-none ml-2">
                                      ✋ Tahan &amp; Drag
                                  </span>
                              </h3>
                              <p className="text-teal-100 font-bold text-xs mt-0.5">
                                  Pilih grade demonomer sebelum masuk ke mode Grade Change.
                              </p>
                          </div>
                          <button 
                              onClick={() => setIsGradeChangeModalOpen(false)} 
                              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors text-white"
                              title="Tutup"
                          >
                              <X className="w-5 h-5" />
                          </button>
                      </div>

                      {/* Body */}
                      <div className="p-6 space-y-5">
                          {/* Plant Current Grade Info */}
                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                              <div>
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Grade Utama Reaktor</span>
                                  <span className="text-sm font-black text-slate-800 dark:text-white">Saat ini running di jadwal</span>
                              </div>
                              <span className={`px-4 py-1.5 rounded-lg text-sm font-black text-white shadow-sm ${GRADE_COLORS[config.currentGrade] || 'bg-slate-700'}`}>
                                  {config.currentGrade}
                              </span>
                          </div>

                          {/* Choose Demonomer Grade */}
                          <div>
                              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
                                  Pilih Grade Demonomer:
                              </label>
                              <div className="grid grid-cols-5 gap-2">
                                  {GRADES.map(g => {
                                      const isSelected = tempSelectedGradeForChange === g;
                                      return (
                                          <button
                                              key={g}
                                              type="button"
                                              onClick={() => setTempSelectedGradeForChange(g)}
                                              className={`py-3.5 px-2 rounded-xl font-black text-sm sm:text-base flex flex-col items-center justify-center gap-1 transition-all border-2 ${
                                                  isSelected 
                                                      ? `${GRADE_COLORS[g]} text-white border-teal-400 dark:border-white shadow-lg scale-105 ring-2 ring-teal-400/50` 
                                                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/20'
                                              }`}
                                          >
                                              <span>{g}</span>
                                              {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>

                          {/* Selected Grade Summary Card */}
                          <div className="bg-teal-50/70 dark:bg-teal-950/30 p-4 rounded-xl border border-teal-200 dark:border-teal-800/50 flex items-center justify-between">
                              <div>
                                  <span className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-400 tracking-wider block">Grade Demonomer Terpilih</span>
                                  <span className="text-xl font-black text-teal-900 dark:text-teal-200">
                                      {tempSelectedGradeForChange}
                                  </span>
                              </div>
                              <div className="text-right">
                                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider block">Steam Multiplier</span>
                                  <span className="text-lg font-mono font-black text-slate-800 dark:text-white">
                                      {demonomerData.multipliers[tempSelectedGradeForChange as keyof typeof demonomerData.multipliers] ?? '-'}
                                  </span>
                              </div>
                          </div>

                          {/* Explanation */}
                          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                              ℹ️ Mode <strong>Grade Change</strong> memungkinkan perhitungan steam rasio demonomer menggunakan grade yang berbeda dengan grade reaktor yang sedang berlangsung.
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 pt-2">
                              <button
                                  type="button"
                                  onClick={() => setIsGradeChangeModalOpen(false)}
                                  className="flex-1 py-3 px-4 rounded-xl font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase text-xs tracking-wider"
                              >
                                  Batal
                              </button>
                              <button
                                  type="button"
                                  onClick={handleConfirmGradeChange}
                                  className="flex-1 py-3 px-4 rounded-xl font-black text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/30 transition-all transform active:scale-95 uppercase text-xs tracking-wider flex items-center justify-center gap-2"
                              >
                                  <Check className="w-4 h-4" />
                                  Konfirmasi &amp; Lanjut
                              </button>
                          </div>
                      </div>
                  </div>
              </DraggableModal>
          </div>
      )}

      {/* --- CATALYST PRESETS MODAL --- */}
      {isCatalystModalOpen && (
          <div className="fixed inset-0 pointer-events-none z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <DraggableModal className="w-full max-w-xl">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all scale-100 ring-4 ring-indigo-500/50 catalyst-modal-container">
                      <div className="bg-indigo-600 text-white p-5 flex items-center justify-between cursor-grab active:cursor-grabbing">
                          <h3 className="text-xl font-black flex items-center gap-2">
                              <Sliders className="w-6 h-6 text-yellow-300 animate-pulse" />
                              PRESET CATALYST PER GRADE
                              <span className="hidden lg:inline px-2 py-0.5 text-[10px] bg-white/20 text-white font-bold rounded border border-white/30 select-none ml-2">
                                  ✋ Tahan &amp; Drag
                              </span>
                          </h3>
                          <button onClick={() => setIsCatalystModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                  <div className="p-5 space-y-4">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Atur jumlah catalyst untuk setiap grade di bawah ini. Anda dapat meng-apply langsung ke tabel polymer atau menyimpan preset ke database.
                      </p>
                      
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                          <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-[0.8em]">
                                      <th className="p-3 uppercase">Grade</th>
                                      <th className="p-3 uppercase">Catalyst 1</th>
                                      <th className="p-3 uppercase">Catalyst 2</th>
                                      <th className="p-3 text-center uppercase">Aksi</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                                  {/* SM Row */}
                                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                      <td className="p-3 font-black text-slate-800 dark:text-white">SM</td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">F:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SM?.F || ''} 
                                                  onChange={(e) => handleTempPresetChange('SM', 'F', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="0"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">H:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SM?.H || ''} 
                                                  onChange={(e) => handleTempPresetChange('SM', 'H', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="0"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3 text-center">
                                          <button 
                                              onClick={() => applyCatalystPreset('SM')}
                                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-lg font-black text-[0.75em] uppercase tracking-wider transition-colors border border-indigo-200/50 dark:border-indigo-800/50"
                                          >
                                              Apply
                                          </button>
                                      </td>
                                  </tr>

                                  {/* SLP Row */}
                                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                      <td className="p-3 font-black text-slate-800 dark:text-white">SLP</td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">F:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SLP?.F || ''} 
                                                  onChange={(e) => handleTempPresetChange('SLP', 'F', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="XX"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">H:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SLP?.H || ''} 
                                                  onChange={(e) => handleTempPresetChange('SLP', 'H', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="XX"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3 text-center">
                                          <button 
                                              onClick={() => applyCatalystPreset('SLP')}
                                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-lg font-black text-[0.75em] uppercase tracking-wider transition-colors border border-indigo-200/50 dark:border-indigo-800/50"
                                          >
                                              Apply
                                          </button>
                                      </td>
                                  </tr>

                                  {/* SLK Row */}
                                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                      <td className="p-3 font-black text-slate-800 dark:text-white">SLK</td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">F:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SLK?.F || ''} 
                                                  onChange={(e) => handleTempPresetChange('SLK', 'F', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="XX"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">H:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SLK?.H || ''} 
                                                  onChange={(e) => handleTempPresetChange('SLK', 'H', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="XX"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3 text-center">
                                          <button 
                                              onClick={() => applyCatalystPreset('SLK')}
                                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-lg font-black text-[0.75em] uppercase tracking-wider transition-colors border border-indigo-200/50 dark:border-indigo-800/50"
                                          >
                                              Apply
                                          </button>
                                      </td>
                                  </tr>

                                  {/* SE Row */}
                                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                      <td className="p-3 font-black text-slate-800 dark:text-white">SE</td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">F:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SE?.F || ''} 
                                                  onChange={(e) => handleTempPresetChange('SE', 'F', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="XX"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">G:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SE?.G || ''} 
                                                  onChange={(e) => handleTempPresetChange('SE', 'G', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="XX"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3 text-center">
                                          <button 
                                              onClick={() => applyCatalystPreset('SE')}
                                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-lg font-black text-[0.75em] uppercase tracking-wider transition-colors border border-indigo-200/50 dark:border-indigo-800/50"
                                          >
                                              Apply
                                          </button>
                                      </td>
                                  </tr>

                                  {/* SR Row */}
                                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                      <td className="p-3 font-black text-slate-800 dark:text-white">SR</td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">F:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SR?.F || ''} 
                                                  onChange={(e) => handleTempPresetChange('SR', 'F', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="XX"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-400 uppercase">G:</span>
                                              <input 
                                                  type="text" 
                                                  value={tempCatalystPresets.SR?.G || ''} 
                                                  onChange={(e) => handleTempPresetChange('SR', 'G', e.target.value)}
                                                  className="w-24 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center font-bold px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                  placeholder="XX"
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3 text-center">
                                          <button 
                                              onClick={() => applyCatalystPreset('SR')}
                                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-lg font-black text-[0.75em] uppercase tracking-wider transition-colors border border-indigo-200/50 dark:border-indigo-800/50"
                                          >
                                              Apply
                                          </button>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              onClick={() => setIsCatalystModalOpen(false)}
                              className="flex-1 px-6 py-3 rounded-xl font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-sm"
                          >
                              BATAL
                          </button>
                          <button 
                              onClick={saveCatalystPresets}
                              className="flex-1 px-6 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all uppercase tracking-widest text-sm"
                          >
                              SIMPAN PRESETS
                          </button>
                      </div>
                  </div>
              </div>
          </DraggableModal>
      </div>
  )}

      {/* --- EDIT RUMUS MODAL --- */}
      {isFormulaModalOpen && (
          <div className="fixed inset-0 pointer-events-none z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <DraggableModal className="w-full max-w-md">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 ring-4 ring-blue-500/50">
                      <div className="bg-blue-600 text-white p-6 flex items-center justify-between cursor-grab active:cursor-grabbing">
                          <h3 className="text-2xl font-black flex items-center gap-2">
                              <Calculator className="w-8 h-8 text-yellow-300" />
                              EDIT RUMUS
                              <span className="hidden lg:inline px-2 py-0.5 text-[10px] bg-white/20 text-white font-bold rounded border border-white/30 select-none ml-2">
                                  ✋ Tahan &amp; Drag
                              </span>
                          </h3>
                          <button onClick={() => setIsFormulaModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                              <X className="w-6 h-6" />
                          </button>
                      </div>
                      <div className="p-6 space-y-4">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">RUMUS CYCLE TIME</label>
                              <input 
                                  type="text"
                                  value={tempFormula}
                                  onChange={(e) => setTempFormula(e.target.value)}
                                  className="w-full font-mono text-lg font-bold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                  placeholder="(COMP - HOLD) + 2"
                              />
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                              <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-2">Variabel yang tersedia:</h4>
                              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 font-bold">
                                  <li><span className="text-blue-600 dark:text-blue-400">COMP</span> : Total durasi dari NS START ke BLOWING COMPLETE (menit)</li>
                                  <li><span className="text-blue-600 dark:text-blue-400">HOLD</span> : Durasi BLOWING HOLD (menit)</li>
                              </ul>
                          </div>
                          <div className="flex gap-3 pt-2">
                              <button 
                                  onClick={() => setIsFormulaModalOpen(false)}
                                  className="flex-1 px-6 py-3 rounded-xl font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest"
                              >
                                  BATAL
                              </button>
                              <button 
                                  onClick={() => {
                                      handleDemonomerChange('cycleTimeFormula', tempFormula);
                                      setIsFormulaModalOpen(false);
                                  }}
                                  className="flex-1 px-6 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all uppercase tracking-widest"
                              >
                                  SIMPAN
                              </button>
                          </div>
                      </div>
                  </div>
              </DraggableModal>
          </div>
      )}

      {/* --- START SILO CONFIRMATION MODAL --- */}
      {startSiloData && (
          <div className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <DraggableModal className="w-full max-w-md">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 ring-4 ring-emerald-500/50">
                      {/* Header */}
                      <div className="bg-emerald-600 text-white p-6 flex items-center justify-between cursor-grab active:cursor-grabbing">
                          <div>
                              <h3 className="text-2xl font-black flex items-center gap-2">
                                  <PlayCircle className="w-8 h-8 text-yellow-300" />
                                  START SILO {startSiloData.id}
                                  <span className="hidden lg:inline px-2 py-0.5 text-[10px] bg-white/20 text-white font-bold rounded border border-white/30 select-none ml-2">
                                      ✋ Tahan &amp; Drag
                                  </span>
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
                              onChange={(e) => setStartSiloData({...startSiloData, lotNumber: e.target.value.toUpperCase()})}
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
                      <div className="space-y-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Start Time Confirmation</label>
                          
                          <div className="flex items-center justify-center gap-2 font-mono py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner w-full">
                              {(() => {
                                  const timeString = startSiloData.startTime || '00:00';
                                  const parts = timeString.split(':');
                                  const hourVal = parts[0] ?? '00';
                                  const minuteVal = parts[1] ?? '00';
                                  
                                  const updateTime = (h: string, m: string) => {
                                      setStartSiloData({ ...startSiloData, startTime: `${h}:${m}` });
                                  };

                                  const handleBlur = () => {
                                      const paddedH = (hourVal || '00').padStart(2, '0');
                                      const paddedM = (minuteVal || '00').padStart(2, '0');
                                      setStartSiloData({ ...startSiloData, startTime: `${paddedH}:${paddedM}` });
                                  };

                                  return (
                                      <div className="flex items-center justify-center gap-1">
                                          <input 
                                              type="text"
                                              maxLength={2}
                                              value={hourVal}
                                              onChange={(e) => {
                                                  const val = e.target.value.replace(/\D/g, '');
                                                  updateTime(val, minuteVal);
                                              }}
                                              onBlur={handleBlur}
                                              className="w-12 bg-transparent text-center font-mono font-black text-3xl text-red-600 dark:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
                                              placeholder="00"
                                          />
                                          <span className="text-red-600 dark:text-red-500 text-3xl font-bold animate-pulse">:</span>
                                          <input 
                                              type="text"
                                              maxLength={2}
                                              value={minuteVal}
                                              onChange={(e) => {
                                                  const val = e.target.value.replace(/\D/g, '');
                                                  updateTime(hourVal, val);
                                              }}
                                              onBlur={handleBlur}
                                              className="w-12 bg-transparent text-center font-mono font-black text-3xl text-red-600 dark:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
                                              placeholder="00"
                                          />
                                      </div>
                                  );
                              })()}
                          </div>
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
          </DraggableModal>
      </div>
  )}

      {/* ... [Reschedule Modal] ... */}
      {selectedItem && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-2 sm:p-4">
            <DraggableModal className="w-full max-w-lg">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                    <div className="bg-slate-800 dark:bg-slate-950 text-white p-4 sm:p-6 flex justify-between items-center shrink-0 cursor-grab active:cursor-grabbing">
                        <div>
                            <h3 className="text-lg sm:text-2xl font-black flex items-center gap-2">
                                <Edit3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                                Adjust Schedule
                                <span className="hidden lg:inline px-2 py-0.5 text-[10px] bg-white/20 text-white font-bold rounded border border-white/30 select-none ml-2">
                                    ✋ Tahan &amp; Drag
                                </span>
                            </h3>
                            <p className="text-[11px] sm:text-sm font-bold text-slate-400">
                                Reaktor {selectedItem.reactorId} &bull; Batch {selectedItem.batchNumber || '---'}
                            </p>
                        </div>
                        <button onClick={closeRescheduleModal} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                    
                    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
                        
                        {/* FITUR KHUSUS: INPUT FOR RE-S (Hanya untuk Reaktor S Cycle Pertama) */}
                        {selectedItem.reactorId === 'S' && selectedItem.cycleIndex === 0 && (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Sequence Control</label>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Update No Batch & Start Time Reaktor S
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => handleResetSequence(selectedItem)} 
                                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-black bg-red-600 text-white hover:bg-red-700 border border-red-700 transition-all shadow-lg transform active:scale-95 text-xs uppercase tracking-wider shrink-0 w-full sm:w-auto`}
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    INPUT FOR RE-S
                                </button>
                            </div>
                        )}
                        
                        {/* Notes */}
                        <div className="mb-4 sm:mb-6">
                            <label className="text-[11px] sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase mb-2 sm:mb-3 block">Operator Notes</label>
                            <textarea 
                                value={editForm.note} 
                                onChange={(e) => {
                                    setEditForm(prev => ({...prev, note: e.target.value}));
                                    if (!shouldBlinkNote) {
                                        setShouldBlinkNote(true);
                                        setTimeout(() => setShouldBlinkNote(false), 5000);
                                    }
                                }} 
                                onFocus={() => setIsNoteFocused(true)}
                                onBlur={() => setIsNoteFocused(false)}
                                placeholder="Add information for DCS operator..." 
                                className={`w-full border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl p-3 sm:p-4 text-sm sm:text-base font-bold focus:ring-2 focus:ring-blue-500 outline-none min-h-[72px] sm:min-h-[100px] ${editForm.note && !isNoteFocused && shouldBlinkNote ? 'animate-blink border-red-500 ring-2 ring-red-500/20' : ''}`} 
                            />
                        </div>

                        {/* Mode, Grade & Skip Controls */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-6">
                             <div className="flex flex-col gap-2 sm:gap-3">
                                <label className="text-[11px] sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase">Status</label>
                                <select 
                                    value={editForm.isSkipped ? editForm.skipReason : 'ACTIVE'} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'ACTIVE') {
                                            setEditForm(prev => ({ ...prev, isSkipped: false, skipReason: 'PASS' }));
                                        } else {
                                            setEditForm(prev => ({ ...prev, isSkipped: true, skipReason: val as any }));
                                        }
                                    }} 
                                    className={`w-full p-2.5 sm:p-4 rounded-xl border-2 font-black transition-colors text-sm sm:text-lg appearance-none outline-none ${editForm.isSkipped ? 'bg-stone-200 text-stone-700 border-stone-300' : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500'}`}
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="PASS">PASS</option>
                                    <option value="CLEANING_ROBOT">CLEANING ROBOT</option>
                                    <option value="ABNORMAL_REAKSI">ABNORMAL REAKSI</option>
                                    <option value="MAINTENANCE">MAINTENANCE</option>
                                    <option value="POISON_CHARGE">POISON CHARGE</option>
                                </select>
                             </div>
                             <div className="flex flex-col gap-2 sm:gap-3">
                                <label className="text-[11px] sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase">Mode</label>
                                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 sm:p-1.5 border-2 border-slate-200 dark:border-slate-600 gap-1 sm:gap-1.5">
                                    <button onClick={() => handleModeChange('CLOSE')} className={`flex-1 py-1.5 sm:py-3 text-[10px] sm:text-xs font-black rounded-lg transition-all ${editForm.mode === 'CLOSE' ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600'}`}>
                                        CLOSE
                                    </button>
                                    <button onClick={() => handleModeChange('OPEN')} className={`flex-1 py-1.5 sm:py-3 text-[10px] sm:text-xs font-black rounded-lg transition-all ${editForm.mode === 'OPEN' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600'}`}>
                                        OPEN
                                    </button>
                                    <button onClick={() => handleModeChange('CLOSE TO OPEN')} className={`flex-1 py-1.5 sm:py-3 text-[10px] sm:text-xs font-black rounded-lg transition-all ${editForm.mode === 'CLOSE TO OPEN' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600'}`}>
                                        C TO O
                                    </button>
                                </div>
                             </div>
                        </div>

                        {/* Grade Selector (Override) */}
                        <div>
                            <label className="text-[11px] sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase mb-2 sm:mb-3 block">Change Grade (Override)</label>
                            <div className="flex gap-2 sm:gap-3 flex-wrap">
                                {GRADES.map(g => (
                                    <button key={g} onClick={() => setEditForm(prev => ({...prev, grade: g}))} className={`px-3.5 sm:px-5 py-2 sm:py-3 text-sm sm:text-base font-black rounded-lg border-2 transition-all ${editForm.grade === g ? `${GRADE_COLORS[g]} text-white border-slate-800 shadow-md` : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}>
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!editForm.isSkipped && (
                            <>
                                {/* Time Input */}
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 sm:p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                                    <label className="block text-xs sm:text-base font-black text-slate-600 dark:text-slate-300 mb-2 sm:mb-3 flex justify-between">
                                        <span>Start Time</span>
                                        {editForm.mode === 'OPEN' && <span className="text-cyan-600 dark:text-cyan-400 text-sm italic font-bold">-30 mins adjusted</span>}
                                    </label>
                                    <input type="datetime-local" value={editForm.timeValue} onChange={(e) => setEditForm(prev => ({...prev, timeValue: e.target.value}))} className="w-full border-2 border-slate-300 dark:border-slate-600 rounded-xl p-2.5 sm:p-4 text-base sm:text-2xl font-mono font-black text-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition-all bg-white dark:bg-slate-800" />
                                    
                                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t-2 border-slate-200 dark:border-slate-600">
                                        <label className="text-[11px] sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase mb-2 sm:mb-3 block">Quick Delay Adjustment</label>
                                        <div className="flex items-end gap-2 sm:gap-3">
                                            <div className="flex-1">
                                                <span className="text-xs text-slate-400 font-black block mb-1">HOURS</span>
                                                <input type="number" min="0" value={editForm.delayHours} onChange={(e) => setEditForm(prev => ({...prev, delayHours: parseInt(e.target.value) || 0}))} className="w-full border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg p-2 sm:p-3 text-base sm:text-xl font-mono font-black text-center" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-xs text-slate-400 font-black block mb-1">MINUTES</span>
                                                <input type="number" min="0" value={editForm.delayMinutes} onChange={(e) => setEditForm(prev => ({...prev, delayMinutes: parseInt(e.target.value) || 0}))} className="w-full border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg p-2 sm:p-3 text-base sm:text-xl font-mono font-black text-center" />
                                            </div>
                                            <button onClick={applyManualDelay} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg h-auto sm:h-[60px] text-[10px] sm:text-sm leading-tight transition-all shadow-md active:scale-95">
                                                APPLY (+{editForm.manualDelayMinutes}m)
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Shift Toggle */}
                                <div className="flex items-center gap-3 sm:gap-4 bg-orange-50 dark:bg-orange-900/20 p-3 sm:p-4 rounded-xl border-2 border-orange-100 dark:border-orange-900/40 cursor-pointer" onClick={() => setEditForm(prev => ({...prev, shiftSubsequent: !prev.shiftSubsequent}))}>
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${editForm.shiftSubsequent ? 'bg-orange-500 border-orange-600' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'}`}>
                                        {editForm.shiftSubsequent && <div className="w-3 h-3 bg-white dark:bg-white rounded-sm" />}
                                    </div>
                                    <div className="flex-1">
                                        <span className="block text-xs sm:text-base font-black text-slate-700 dark:text-slate-300">
                                            {editForm.shiftSubsequent ? 'Continue Interval (Shift Active)' : 'Stop Running Interval (Shift Schedule)'}
                                        </span>
                                        <span className="block text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500">Delay will push all subsequent batches forward</span>
                                    </div>
                                    <PauseCircle className="w-6 h-6 text-orange-400" />
                                </div>

                                {/* Custom Subsequent Interval Adjuster */}
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 sm:p-6 rounded-xl border-2 border-blue-200 dark:border-blue-900/40">
                                    <div 
                                        className="flex items-center gap-4 cursor-pointer mb-4 select-none" 
                                        onClick={() => setEditForm(prev => ({ ...prev, hasCustomInterval: !prev.hasCustomInterval }))}
                                    >
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${editForm.hasCustomInterval ? 'bg-blue-600 border-blue-700' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'}`}>
                                            {editForm.hasCustomInterval && <div className="w-3 h-3 bg-white dark:bg-white rounded-sm" />}
                                        </div>
                                        <div className="flex-1">
                                            <span className="block text-xs sm:text-base font-black text-blue-800 dark:text-blue-300">
                                                Adjust Subsequent Cycle Interval
                                            </span>
                                            <span className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                                                Ubah interval cycle berikutnya mulai dari reaktor ini
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t-2 border-blue-100 dark:border-blue-900/30 transition-all">
                                        <label className="text-[11px] sm:text-sm font-black text-blue-700 dark:text-blue-300 uppercase mb-2 sm:mb-3 block">New Interval Value</label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black block mb-1">HOURS</span>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    disabled={!editForm.hasCustomInterval}
                                                    value={editForm.customIntervalHours} 
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, customIntervalHours: Math.max(0, parseInt(e.target.value) || 0) }))} 
                                                    className={`w-full border-2 border-blue-200 dark:border-blue-800 dark:bg-slate-800 dark:text-white rounded-lg p-2 sm:p-3 text-base sm:text-xl font-mono font-black text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all ${!editForm.hasCustomInterval ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900/40' : ''}`} 
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black block mb-1">MINUTES</span>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="59" 
                                                    disabled={!editForm.hasCustomInterval}
                                                    value={editForm.customIntervalMinutes} 
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, customIntervalMinutes: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)) }))} 
                                                    className={`w-full border-2 border-blue-200 dark:border-blue-800 dark:bg-slate-800 dark:text-white rounded-lg p-2 sm:p-3 text-base sm:text-xl font-mono font-black text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all ${!editForm.hasCustomInterval ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900/40' : ''}`} 
                                                />
                                            </div>
                                        </div>
                                        <span className="block text-xs font-bold text-amber-600 dark:text-amber-400 mt-3 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                                            ℹ️ Interval baru ({editForm.customIntervalHours} jam {editForm.customIntervalMinutes} menit) akan berlaku untuk semua reaktor berikutnya dalam cycle yang belum start.
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Stage Info (Sort Info) Selector */}
                        <div className="bg-fuchsia-50 dark:bg-fuchsia-900/20 p-6 rounded-xl border border-fuchsia-100 dark:border-fuchsia-800">
                            <label className="text-sm font-black text-fuchsia-700 dark:text-fuchsia-300 uppercase mb-3 flex items-center gap-1">
                                <Tag className="w-4 h-4" /> Stage Info (Label)
                            </label>
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                {STAGE_OPTIONS.map(opt => (
                                    <button key={opt} onClick={() => setEditForm(prev => ({...prev, stageInfo: opt}))} className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-black rounded-lg border transition-all ${editForm.stageInfo === opt ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-fuchsia-100 dark:hover:bg-slate-600'}`}>
                                        {opt}
                                    </button>
                                ))}
                                <button onClick={() => setEditForm(prev => ({...prev, stageInfo: ''}))} className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-black rounded-lg border transition-all ${editForm.stageInfo === '' ? 'bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-600 dark:text-slate-300 dark:border-slate-500' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                                    Clear
                                </button>
                            </div>
                            <div className="mt-4">
                                <input 
                                    type="text" 
                                    value={editForm.stageInfo} 
                                    onChange={(e) => setEditForm(prev => ({...prev, stageInfo: e.target.value}))}
                                    placeholder="Or type custom label..."
                                    className="w-full border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg p-2.5 sm:p-3 text-sm sm:text-base font-black focus:ring-2 focus:ring-fuchsia-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 p-3 sm:p-6 border-t-2 border-slate-200 dark:border-slate-800 flex gap-2 sm:gap-4 justify-end shrink-0">
                        {config.itemConfigs[selectedItem.id] && (
                            <button onClick={clearOverride} className="px-3 sm:px-6 py-2.5 sm:py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-black text-xs sm:text-base transition-colors mr-auto border-2 border-transparent hover:border-red-200">
                                Reset
                            </button>
                        )}
                        <button onClick={closeRescheduleModal} className="px-3 sm:px-6 py-2.5 sm:py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-black text-xs sm:text-base">
                            Cancel
                        </button>
                        <button onClick={saveReschedule} className="px-4 sm:px-8 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm sm:text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95">
                            Save Changes
                        </button>
                    </div>
                </div>
            </DraggableModal>
        </div>
      )}

      {/* --- Edit Reactor Note Modal --- */}
      {editingReactorNote && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
              <DraggableModal className="w-full max-w-sm">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 cursor-grab active:cursor-grabbing">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center justify-between">
                          <span>Edit Note untuk Reaktor {editingReactorNote}</span>
                          <span className="hidden lg:inline text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-normal select-none">✋ Drag</span>
                      </h3>
                      <div className="flex justify-center mb-4">
                          <textarea
                            value={tempReactorNote}
                            onChange={(e) => setTempReactorNote(e.target.value)}
                            placeholder="Enter note..."
                            className="w-[220px] border-2 border-red-600 bg-yellow-400 text-black rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-left resize-none shadow-sm leading-tight text-sm"
                            rows={3}
                            autoFocus
                          />
                      </div>
                      <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingReactorNote(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                              Cancel
                          </button>
                          <button onClick={saveReactorNote} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
                              Save
                          </button>
                      </div>
                  </div>
              </DraggableModal>
          </div>
      )}

      {/* --- Reset Sequence Modal --- */}
      {isResetModalOpen && (
          <div className="fixed inset-0 pointer-events-none z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <DraggableModal className="w-full max-w-md">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 ring-4 ring-red-500/50">
                      {/* Header */}
                      <div className="bg-red-600 text-white p-6 flex items-center justify-between cursor-grab active:cursor-grabbing">
                          <div>
                              <h3 className="text-2xl font-black flex items-center gap-2">
                                  <RotateCcw className="w-8 h-8 text-yellow-300" />
                                  RESET SEQUENCE
                                  <span className="hidden lg:inline px-2 py-0.5 text-[10px] bg-white/20 text-white font-bold rounded border border-white/30 select-none ml-2">
                                      ✋ Tahan &amp; Drag
                                  </span>
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

                      {/* Time Input with Helpers */}
                      <div className="space-y-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">New Start Time (Reaktor S)</label>
                          <input 
                              type="datetime-local" 
                              value={resetParams.time}
                              onChange={(e) => setResetParams({...resetParams, time: e.target.value})}
                              className="w-full bg-transparent text-center font-mono font-bold text-xl outline-none border-b-2 border-slate-300 focus:border-red-500 dark:text-white"
                          />
                          
                          {/* Easy Time Adjustment Helpers */}
                          <div className="pt-3 space-y-2">
                              <button
                                  type="button"
                                  onClick={() => {
                                      setResetParams(prev => ({ ...prev, time: getLocalIsoString(new Date()) }));
                                  }}
                                  className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-black text-xs transition-colors uppercase tracking-wider"
                              >
                                  Gunakan Waktu Sekarang
                              </button>
                              
                              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                                  <button
                                      type="button"
                                      onClick={() => adjustResetParamsTime(-60)}
                                      className="py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 rounded font-bold transition-all"
                                  >
                                      -1 Jam
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => adjustResetParamsTime(-10)}
                                      className="py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 rounded font-bold transition-all"
                                  >
                                      -10 Min
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => adjustResetParamsTime(10)}
                                      className="py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-200 rounded font-bold transition-all"
                                  >
                                      +10 Min
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => adjustResetParamsTime(60)}
                                      className="py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-200 rounded font-bold transition-all"
                                  >
                                      +1 Jam
                                  </button>
                              </div>
                          </div>
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
          </DraggableModal>
      </div>
  )}

      {/* --- FIE2002 HOURLY TREND MODAL --- */}
      <Fie2002TrendModal 
          isOpen={isFie2002TrendOpen}
          onClose={() => setIsFie2002TrendOpen(false)}
          currentValue={demonomerData.f2002}
          history={fie2002TrendHistory}
          onAddManualEntry={handleAddManualFieTrend}
          onClearHistory={handleClearFieTrend}
          onResetDefaultHistory={handleResetDefaultFieTrend}
      />

      {/* --- FLOATING AUDIO NOTIFICATION TOAST --- */}
      {audioNotification && audioNotification.show && (
          /* Di HP melebar penuh dengan margin kecil; di layar besar tetap kartu
             di pojok kanan atas. */
          <div className="fixed top-2 left-2 right-2 sm:top-4 sm:right-4 sm:left-auto sm:w-full sm:max-w-sm z-[96] bg-white dark:bg-slate-800 border-2 border-emerald-500 shadow-2xl rounded-2xl p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
              <div className="p-2 sm:p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                      <h4 className="font-black text-[11px] sm:text-sm text-slate-800 dark:text-white uppercase tracking-tight leading-tight">
                          {audioNotification.message}
                      </h4>
                      <button 
                          onClick={() => setAudioNotification(null)}
                          className="p-1.5 -m-0.5 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                          title="Tutup Notifikasi"
                      >
                          <X className="w-4 h-4" />
                      </button>
                  </div>
                  {audioNotification.subMessage && (
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-snug">
                          {audioNotification.subMessage}
                      </p>
                  )}
                  <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Siap Bunyi Otomatis
                      </span>
                  </div>
              </div>
          </div>
      )}

      {/* --- SETTINGS POPUP MODAL --- */}
      {renderSettingsModal()}

    </div>
  );
};

export default App;
