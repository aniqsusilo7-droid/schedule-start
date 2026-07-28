import React, { useState, useMemo } from 'react';
import { 
  X, TrendingUp, TrendingDown, Clock, Calendar, RefreshCw, 
  Plus, Trash2, Download, Activity, Sparkles, Database, Check, AlertCircle, CheckCircle2, ShieldCheck, Zap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';

export interface Fie2002TrendEntry {
  id: string;
  timestamp: number; // Unix epoch ms
  timeString: string; // e.g. "27/07 14:00:15"
  hourKey: string; // e.g. "2026-07-27 14:00"
  value: number;
  note?: string;
}

interface Fie2002TrendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: number;
  history: Fie2002TrendEntry[];
  onAddManualEntry?: (val: number, hourStr?: string) => void;
  onClearHistory?: () => void;
  onResetDefaultHistory?: () => void;
}

export type TimeRangeOption = '1h' | '24h' | '3d' | '7d' | 'all';

export const Fie2002TrendModal: React.FC<Fie2002TrendModalProps> = ({
  isOpen,
  onClose,
  currentValue,
  history,
  onAddManualEntry,
  onClearHistory,
  onResetDefaultHistory
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('7d');
  const [showTable, setShowTable] = useState(false);
  const [manualValue, setManualValue] = useState<string>('');
  const [manualHour, setManualHour] = useState<string>('');

  // 1. Filter history according to selected time range
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    const now = Date.now();
    
    let msCutoff = 0;
    if (timeRange === '1h') msCutoff = 60 * 60 * 1000;
    else if (timeRange === '24h') msCutoff = 24 * 60 * 60 * 1000;
    else if (timeRange === '3d') msCutoff = 3 * 24 * 60 * 60 * 1000;
    else if (timeRange === '7d') msCutoff = 7 * 24 * 60 * 60 * 1000;
    else return history; // 'all'

    return history.filter(h => (now - h.timestamp) <= msCutoff);
  }, [history, timeRange]);

  // 2. Process statistics for selected filtered view
  const stats = useMemo(() => {
    const list = filteredHistory.length > 0 ? filteredHistory : history;
    if (!list || list.length === 0) {
      return { avg: currentValue, min: currentValue, max: currentValue, count: 0, delta: 0, deltaPercent: 0 };
    }
    const values = list.map(h => h.value);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = Number((sum / values.length).toFixed(1));
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const firstVal = list[0]?.value ?? currentValue;
    const lastVal = list[list.length - 1]?.value ?? currentValue;
    const delta = Number((lastVal - firstVal).toFixed(1));
    const deltaPercent = firstVal !== 0 ? Number(((delta / firstVal) * 100).toFixed(1)) : 0;
    
    return { avg, min, max, count: list.length, delta, deltaPercent };
  }, [filteredHistory, history, currentValue]);

  // 3. Compute Current Trend Condition / Status
  const trendCondition = useMemo(() => {
    const list = history.length > 0 ? history : filteredHistory;
    if (!list || list.length === 0) {
      return {
        status: 'STABIL',
        color: 'cyan',
        bgClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
        badgeBg: 'bg-cyan-500 text-slate-950',
        icon: CheckCircle2,
        title: 'KONDISI TREND: STABIL',
        description: 'Nilai FIE2002 saat ini dalam batas normal & relatif konstan.'
      };
    }

    // Examine recent points (last 10 points or last 1 hour)
    const recent = list.slice(-Math.min(12, list.length));
    const firstRecent = recent[0].value;
    const lastRecent = currentValue;
    const diff = lastRecent - firstRecent;

    // Standard deviation or variance in recent entries
    const recentAvg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
    const variance = recent.reduce((a, b) => a + Math.pow(b.value - recentAvg, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 4.5) {
      return {
        status: 'FLUKTUATIF',
        color: 'purple',
        bgClass: 'bg-purple-500/10 border-purple-500/30 text-purple-300 dark:text-purple-300',
        badgeBg: 'bg-purple-500 text-white',
        icon: Activity,
        title: 'KONDISI TREND: FLUKTUATIF (VARIAL SANGAT TINGGI)',
        description: `Terjadi fluktuasi/lonjakan variasi nilai FIE2002 dalam beberapa log terakhir (StdDev: ${stdDev.toFixed(1)}).`
      };
    }

    if (diff >= 0.5) {
      return {
        status: 'NAIK (RISING)',
        color: 'emerald',
        bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
        badgeBg: 'bg-emerald-500 text-slate-950',
        icon: TrendingUp,
        title: 'KONDISI TREND: CENDERUNG MENINGKAT (NAIK)',
        description: `Terjadi tren kenaikan sebesar +${diff.toFixed(1)} unit (+${((diff/firstRecent)*100).toFixed(1)}%) dalam beberapa pencatatan terakhir.`
      };
    }

    if (diff <= -0.5) {
      return {
        status: 'TURUN (FALLING)',
        color: 'rose',
        bgClass: 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300',
        badgeBg: 'bg-rose-500 text-white',
        icon: TrendingDown,
        title: 'KONDISI TREND: CENDERUNG MENURUN (TURUN)',
        description: `Terjadi tren penurunan sebesar ${diff.toFixed(1)} unit (${((diff/firstRecent)*100).toFixed(1)}%) dalam beberapa pencatatan terakhir.`
      };
    }

    return {
      status: 'STABIL (STABLE)',
      color: 'cyan',
      bgClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
      badgeBg: 'bg-cyan-500 text-slate-950',
      icon: CheckCircle2,
      title: 'KONDISI TREND: STABIL & KONSTAN',
      description: `Nilai FIE2002 relatif konstan dengan variasi kecil (< ±0.5 unit).`
    };
  }, [history, filteredHistory, currentValue]);

  if (!isOpen) return null;

  // Handle Manual Add
  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(manualValue);
    if (!isNaN(val) && onAddManualEntry) {
      onAddManualEntry(val, manualHour || undefined);
      setManualValue('');
      setManualHour('');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const list = filteredHistory.length > 0 ? filteredHistory : history;
    if (!list || list.length === 0) return;
    const headers = "ID,Timestamp,TimeString,HourKey,Value,Note\n";
    const rows = list.map(h => `"${h.id}","${new Date(h.timestamp).toISOString()}","${h.timeString}","${h.hourKey}",${h.value},"${h.note || ''}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fie2002_trend_7hari_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: Fie2002TrendEntry = payload[0].payload;
      const d = new Date(data.timestamp);
      const fullDateFormatted = d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-cyan-500/40 backdrop-blur-md font-sans">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-400 mb-1.5 border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1 font-bold text-cyan-400">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> {data.timeString}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{fullDateFormatted}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 tracking-tight">{data.value}</span>
            <span className="text-xs font-bold text-slate-400 uppercase">FIE2002</span>
          </div>
          {data.note && <div className="text-[11px] text-slate-300 mt-1 italic">{data.note}</div>}
        </div>
      );
    }
    return null;
  };

  const TrendIcon = trendCondition.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 dark:bg-black/20 rounded-2xl border border-white/20 shadow-inner">
              <Activity className="w-6 h-6 text-cyan-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black tracking-wide uppercase">GRAFIK TREND FIE2002</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-black uppercase tracking-wider border border-emerald-300/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-300 animate-bounce" /> LIVE RECORDING PER MENIT (7 HARI)
                </span>
              </div>
              <p className="text-xs text-cyan-100/90 font-medium">
                Pencatatan waktu real-time per menit &amp; riwayat trend hingga 1 minggu (7 hari) ke belakang
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">

          {/* Banner Status Kondisi Trend Saat Ini */}
          <div className={`p-4 rounded-2xl border ${trendCondition.bgClass} shadow-sm flex items-start justify-between gap-4 flex-wrap`}>
            <div className="flex items-start gap-3 flex-1 min-w-[260px]">
              <div className={`p-2.5 rounded-2xl ${trendCondition.badgeBg} shrink-0 shadow-md`}>
                <TrendIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider">KONDISI TREND SAAT INI</span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${trendCondition.badgeBg}`}>
                    {trendCondition.status}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold mt-0.5">{trendCondition.title}</h4>
                <p className="text-xs opacity-90 mt-1 leading-relaxed">
                  {trendCondition.description} Rata-rata 7 hari terkahir adalah <strong className="font-black text-amber-500 dark:text-amber-300">{stats.avg}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Delta Periode</div>
                <div className={`font-black ${stats.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {stats.delta >= 0 ? `+${stats.delta}` : stats.delta} ({stats.deltaPercent >= 0 ? `+${stats.deltaPercent}%` : `${stats.deltaPercent}%`})
                </div>
              </div>
            </div>
          </div>

          {/* Time Range Filter Tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-100 dark:bg-slate-800/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 px-2 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-500" /> RENTANG WAKTU:
              </span>
              <button
                onClick={() => setTimeRange('1h')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all uppercase tracking-wider ${
                  timeRange === '1h' 
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                1 Jam (Live)
              </button>
              <button
                onClick={() => setTimeRange('24h')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all uppercase tracking-wider ${
                  timeRange === '24h' 
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                24 Jam
              </button>
              <button
                onClick={() => setTimeRange('3d')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all uppercase tracking-wider ${
                  timeRange === '3d' 
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                3 Hari
              </button>
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all uppercase tracking-wider ${
                  timeRange === '7d' 
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                7 Hari (1 Minggu)
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all uppercase tracking-wider ${
                  timeRange === 'all' 
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Semua Data
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold px-2">
              Tampil: <span className="text-cyan-600 dark:text-cyan-400 font-black">{filteredHistory.length}</span> / {history.length} data point
            </div>
          </div>

          {/* Quick Stats Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Current Value Card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> NILAI TERKINI
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight">
                  {currentValue}
                </span>
                {stats.delta !== 0 && (
                  <span className={`text-xs font-extrabold flex items-center ${stats.delta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stats.delta > 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                    {stats.delta > 0 ? `+${stats.delta}` : stats.delta}
                  </span>
                )}
              </div>
            </div>

            {/* Average Card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                RATA-RATA (PERIODE)
              </span>
              <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-2">
                {stats.avg}
              </div>
            </div>

            {/* Min - Max Card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                RENTANG (MIN - MAX)
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl font-extrabold text-rose-500">{stats.min}</span>
                <span className="text-slate-400 font-bold">-</span>
                <span className="text-xl font-extrabold text-emerald-500">{stats.max}</span>
              </div>
            </div>

            {/* Total Entries Card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" /> TOTAL SAMPLING
              </span>
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mt-2">
                {stats.count} <span className="text-xs font-medium text-slate-400">Log</span>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Line / Area Chart */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                <h4 className="font-extrabold text-sm text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  GRAFIK TREN FIE2002 ({timeRange === '7d' ? '7 HARI TERAKHIR' : timeRange.toUpperCase()})
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1 bg-cyan-400 rounded-full inline-block" /> Nilai FIE2002
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-amber-400 border border-dashed border-amber-400 inline-block" /> Rata-Rata ({stats.avg})
                </span>
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredHistory} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fieColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                  <XAxis 
                    dataKey="timeString" 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    domain={['dataMin - 10', 'dataMax + 10']}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine 
                    y={stats.avg} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4" 
                    label={{ value: `Avg: ${stats.avg}`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#06b6d4" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#fieColor)" 
                    activeDot={{ r: 7, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Controls & Actions Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowTable(!showTable)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl transition-all uppercase tracking-wider flex items-center gap-2"
              >
                <Database className="w-4 h-4 text-cyan-500" />
                {showTable ? 'SEMBUNYIKAN TABEL LOG' : 'LIHAT TABEL RIWAYAT LOG'}
              </button>
              
              <button 
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5"
                title="Unduh Data CSV"
              >
                <Download className="w-4 h-4 text-indigo-500" /> EXPORT CSV
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onResetDefaultHistory && (
                <button 
                  onClick={onResetDefaultHistory}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5 border border-amber-500/30"
                  title="Generate data sampel 7 hari"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> RESET DATA SAMPLE 7 HARI
                </button>
              )}
              {onClearHistory && (
                <button 
                  onClick={onClearHistory}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl transition-all uppercase tracking-wider flex items-center gap-1 border border-rose-500/20"
                  title="Hapus semua log"
                >
                  <Trash2 className="w-3.5 h-3.5" /> HAPUS
                </button>
              )}
            </div>
          </div>

          {/* Form Quick Add Manual Entry */}
          <form onSubmit={handleAddManual} className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="font-extrabold text-xs text-blue-950 dark:text-blue-200 uppercase tracking-wider block">
                  TAMBAH LOG MANUAL
                </span>
                <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                  Masukkan nilai FIE2002 kustom untuk pencatatan manual
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="text"
                placeholder="Jam/Tanggal (e.g. 27/07 15:00)"
                value={manualHour}
                onChange={(e) => setManualHour(e.target.value)}
                className="w-40 px-3 py-1.5 bg-white dark:bg-slate-800 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="number"
                step="0.1"
                placeholder="Nilai FIE2002"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                className="w-32 px-3 py-1.5 bg-white dark:bg-slate-800 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit"
                disabled={!manualValue}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                TAMBAH
              </button>
            </div>
          </form>

          {/* Detailed Log Table View */}
          {showTable && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-in fade-in duration-200">
              <div className="px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>RIWAYAT DATA LOG ({filteredHistory.length} LOG)</span>
                <span className="text-[10px] text-slate-400 font-normal">Diurutkan berdasarkan waktu terbaru</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 font-bold">Waktu Jam/Tanggal</th>
                      <th className="p-3 font-bold">Detail Timestamp</th>
                      <th className="p-3 font-bold text-center">Nilai FIE2002</th>
                      <th className="p-3 font-bold text-right">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredHistory.slice().reverse().map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 font-extrabold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-500" /> {entry.timeString}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {new Date(entry.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3 font-black text-center text-slate-900 dark:text-white text-sm">
                          {entry.value}
                        </td>
                        <td className="p-3 text-right text-slate-400 italic">
                          {entry.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <AlertCircle className="w-4 h-4 text-cyan-500" />
            <span>Pencatatan dilakukan secara otomatis <strong className="text-cyan-600 dark:text-cyan-400">setiap 1 menit (live time)</strong> dan disimpan hingga <strong className="text-cyan-600 dark:text-cyan-400">7 hari ke belakang</strong>.</span>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
          >
            TUTUP
          </button>
        </div>

      </div>
    </div>
  );
};
