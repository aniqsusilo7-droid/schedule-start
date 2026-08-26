import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import convert from 'convert';
import type { Unit } from 'convert';
import { ArrowDownUp, Check, ChevronDown } from 'lucide-react';

type CategoryId = 'pressure' | 'temperature' | 'volume' | 'mass' | 'length' | 'energy' | 'power' | 'flow';

interface UnitOption {
  id: string;
  label: string;
  symbol: string;
  unit?: Unit;
  flow?: { volume: Unit; time: Unit };
}

interface ConverterCategory {
  id: CategoryId;
  label: string;
  description: string;
  units: UnitOption[];
  defaultFrom: string;
  defaultTo: string;
}

const CATEGORIES: ConverterCategory[] = [
  {
    id: 'pressure',
    label: 'Tekanan',
    description: 'Tekanan proses, instrumentasi, dan utilitas.',
    units: [
      { id: 'bar', label: 'Bar', symbol: 'bar', unit: 'bar' },
      { id: 'kilopascal', label: 'Kilopascal', symbol: 'kPa', unit: 'kilopascal' },
      { id: 'megapascal', label: 'Megapascal', symbol: 'MPa', unit: 'megapascal' },
      { id: 'pascal', label: 'Pascal', symbol: 'Pa', unit: 'pascal' },
      { id: 'atmosphere', label: 'Atmosfer', symbol: 'atm', unit: 'atmosphere' },
      { id: 'psi', label: 'Pound/in²', symbol: 'psi', unit: 'psi' },
      { id: 'millibar', label: 'Millibar', symbol: 'mbar', unit: 'millibar' },
      { id: 'torr', label: 'Torr', symbol: 'Torr', unit: 'torr' },
      { id: 'inhg', label: 'Inci merkuri', symbol: 'inHg', unit: 'inHg' },
    ],
    defaultFrom: 'bar',
    defaultTo: 'kilopascal',
  },
  {
    id: 'temperature',
    label: 'Suhu',
    description: 'Skala suhu proses dan laboratorium.',
    units: [
      { id: 'celsius', label: 'Celsius', symbol: '°C', unit: 'celsius' },
      { id: 'fahrenheit', label: 'Fahrenheit', symbol: '°F', unit: 'fahrenheit' },
      { id: 'kelvin', label: 'Kelvin', symbol: 'K', unit: 'kelvin' },
      { id: 'rankine', label: 'Rankine', symbol: '°R', unit: 'rankine' },
    ],
    defaultFrom: 'celsius',
    defaultTo: 'fahrenheit',
  },
  {
    id: 'volume',
    label: 'Volume',
    description: 'Kapasitas tangki dan volume material.',
    units: [
      { id: 'cubic-meter', label: 'Meter kubik', symbol: 'm³', unit: 'cubic meter' },
      { id: 'liter', label: 'Liter', symbol: 'L', unit: 'liter' },
      { id: 'milliliter', label: 'Milliliter', symbol: 'mL', unit: 'milliliter' },
      { id: 'cubic-centimeter', label: 'Sentimeter kubik', symbol: 'cm³', unit: 'cubic centimeter' },
      { id: 'cubic-foot', label: 'Kaki kubik', symbol: 'ft³', unit: 'cubic foot' },
      { id: 'gallon-us', label: 'Galon AS', symbol: 'gal', unit: 'gallon' },
      { id: 'gallon-imperial', label: 'Galon imperial', symbol: 'imp gal', unit: 'imperial gallon' },
    ],
    defaultFrom: 'cubic-meter',
    defaultTo: 'liter',
  },
  {
    id: 'mass',
    label: 'Massa',
    description: 'Massa bahan baku, produk, dan dosing.',
    units: [
      { id: 'kilogram', label: 'Kilogram', symbol: 'kg', unit: 'kilogram' },
      { id: 'gram', label: 'Gram', symbol: 'g', unit: 'gram' },
      { id: 'milligram', label: 'Milligram', symbol: 'mg', unit: 'milligram' },
      { id: 'tonne', label: 'Ton metrik', symbol: 't', unit: 'tonne' },
      { id: 'pound', label: 'Pound', symbol: 'lb', unit: 'pound' },
      { id: 'ounce', label: 'Ounce', symbol: 'oz', unit: 'ounce' },
    ],
    defaultFrom: 'kilogram',
    defaultTo: 'tonne',
  },
  {
    id: 'length',
    label: 'Panjang',
    description: 'Dimensi perpipaan, peralatan, dan area kerja.',
    units: [
      { id: 'meter', label: 'Meter', symbol: 'm', unit: 'meter' },
      { id: 'millimeter', label: 'Millimeter', symbol: 'mm', unit: 'millimeter' },
      { id: 'centimeter', label: 'Sentimeter', symbol: 'cm', unit: 'centimeter' },
      { id: 'kilometer', label: 'Kilometer', symbol: 'km', unit: 'kilometer' },
      { id: 'inch', label: 'Inci', symbol: 'in', unit: 'inch' },
      { id: 'foot', label: 'Kaki', symbol: 'ft', unit: 'foot' },
    ],
    defaultFrom: 'meter',
    defaultTo: 'millimeter',
  },
  {
    id: 'energy',
    label: 'Energi',
    description: 'Energi listrik dan kebutuhan proses.',
    units: [
      { id: 'joule', label: 'Joule', symbol: 'J', unit: 'joule' },
      { id: 'kilojoule', label: 'Kilojoule', symbol: 'kJ', unit: 'kilojoule' },
      { id: 'megajoule', label: 'Megajoule', symbol: 'MJ', unit: 'megajoule' },
      { id: 'watt-hour', label: 'Watt-jam', symbol: 'Wh', unit: 'watt-hour' },
      { id: 'kilowatt-hour', label: 'Kilowatt-jam', symbol: 'kWh', unit: 'kilowatt-hour' },
      { id: 'megawatt-hour', label: 'Megawatt-jam', symbol: 'MWh', unit: 'megawatt-hour' },
    ],
    defaultFrom: 'kilowatt-hour',
    defaultTo: 'megajoule',
  },
  {
    id: 'power',
    label: 'Daya',
    description: 'Daya motor, pemanas, dan peralatan proses.',
    units: [
      { id: 'watt', label: 'Watt', symbol: 'W', unit: 'watt' },
      { id: 'kilowatt', label: 'Kilowatt', symbol: 'kW', unit: 'kilowatt' },
      { id: 'megawatt', label: 'Megawatt', symbol: 'MW', unit: 'megawatt' },
      { id: 'horsepower', label: 'Horsepower', symbol: 'hp', unit: 'horsepower' },
    ],
    defaultFrom: 'kilowatt',
    defaultTo: 'horsepower',
  },
  {
    id: 'flow',
    label: 'Laju Aliran',
    description: 'Debit volumetrik untuk aliran cairan dan gas.',
    units: [
      { id: 'liter-minute', label: 'Liter per menit', symbol: 'L/min', flow: { volume: 'liter', time: 'minute' } },
      { id: 'liter-second', label: 'Liter per detik', symbol: 'L/s', flow: { volume: 'liter', time: 'second' } },
      { id: 'cubic-meter-hour', label: 'Meter kubik per jam', symbol: 'm³/h', flow: { volume: 'cubic meter', time: 'hour' } },
      { id: 'cubic-meter-minute', label: 'Meter kubik per menit', symbol: 'm³/min', flow: { volume: 'cubic meter', time: 'minute' } },
      { id: 'cubic-meter-second', label: 'Meter kubik per detik', symbol: 'm³/s', flow: { volume: 'cubic meter', time: 'second' } },
      { id: 'gallon-minute', label: 'Galon AS per menit', symbol: 'gpm', flow: { volume: 'gallon', time: 'minute' } },
      { id: 'cubic-foot-minute', label: 'Kaki kubik per menit', symbol: 'cfm', flow: { volume: 'cubic foot', time: 'minute' } },
    ],
    defaultFrom: 'liter-minute',
    defaultTo: 'cubic-meter-hour',
  },
];

const convertDirect = (value: number, from: Unit, to: Unit): number => {
  const converter = convert(value, from) as unknown as { to: (unit: Unit) => number };
  return converter.to(to);
};

const convertFlow = (value: number, from: UnitOption, to: UnitOption): number => {
  if (!from.flow || !to.flow) throw new Error('Unit laju aliran tidak valid');
  const fromVolume = convertDirect(1, from.flow.volume, 'cubic meter');
  const fromTime = convertDirect(1, from.flow.time, 'second');
  const toVolume = convertDirect(1, to.flow.volume, 'cubic meter');
  const toTime = convertDirect(1, to.flow.time, 'second');
  return value * (fromVolume / fromTime) / (toVolume / toTime);
};

const calculate = (value: number, from: UnitOption, to: UnitOption): number => {
  if (from.flow || to.flow) return convertFlow(value, from, to);
  if (!from.unit || !to.unit) throw new Error('Unit konversi tidak valid');
  return convertDirect(value, from.unit, to.unit);
};

const formatNumber = (value: number): string => {
  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute >= 1e12 || absolute < 1e-9)) {
    return value.toExponential(8).replace(/\.0+(?=e)/, '');
  }
  return new Intl.NumberFormat('id-ID', {
    maximumSignificantDigits: 12,
    useGrouping: true,
  }).format(value);
};

const temperatureFormula: Record<string, string> = {
  'celsius:fahrenheit': '°F = (°C × 9/5) + 32',
  'fahrenheit:celsius': '°C = (°F − 32) × 5/9',
  'celsius:kelvin': 'K = °C + 273,15',
  'kelvin:celsius': '°C = K − 273,15',
  'fahrenheit:kelvin': 'K = (°F − 32) × 5/9 + 273,15',
  'kelvin:fahrenheit': '°F = (K − 273,15) × 9/5 + 32',
  'celsius:rankine': '°R = (°C + 273,15) × 9/5',
  'rankine:celsius': '°C = (°R × 5/9) − 273,15',
  'fahrenheit:rankine': '°R = °F + 459,67',
  'rankine:fahrenheit': '°F = °R − 459,67',
  'kelvin:rankine': '°R = K × 9/5',
  'rankine:kelvin': 'K = °R × 5/9',
};

const getFormula = (category: CategoryId, from: UnitOption, to: UnitOption): string => {
  if (from.id === to.id) return `${from.symbol} = ${to.symbol}`;
  if (category === 'temperature') {
    return temperatureFormula[`${from.id}:${to.id}`] ?? `${from.symbol} → ${to.symbol}`;
  }
  const factor = calculate(1, from, to);
  return `1 ${from.symbol} = ${formatNumber(factor)} ${to.symbol}`;
};

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface DropdownProps {
  ariaLabel: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  buttonClassName?: string;
  menuClassName?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  ariaLabel,
  value,
  options,
  onChange,
  buttonClassName = '',
  menuClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selected = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen(current => !current)}
        className={`flex h-12 items-center justify-between gap-4 rounded-full border border-slate-300 bg-white pl-5 pr-4 text-[16px] font-semibold text-slate-800 outline-none transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-cyan-500 dark:hover:bg-slate-700 dark:focus-visible:ring-cyan-400/30 ${buttonClassName}`}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-blue-600 transition-transform duration-150 dark:text-cyan-400 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute right-0 top-[calc(100%+8px)] z-40 min-w-full overflow-hidden rounded-[20px] border border-blue-200 bg-white p-2 shadow-[0_18px_45px_rgba(37,99,235,.18)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_18px_45px_rgba(0,0,0,.45)] ${menuClassName}`}
        >
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-4 rounded-[14px] px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'text-slate-800 hover:bg-blue-50 dark:text-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{option.label}</span>
                  {option.description && (
                    <span className={`mt-0.5 block truncate text-[12px] font-normal ${
                      isSelected
                        ? 'text-blue-100 dark:text-cyan-950/70'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>{option.description}</span>
                  )}
                </span>
                {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-white dark:text-slate-950" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const UnitConverter: React.FC = () => {
  const [categoryId, setCategoryId] = useState<CategoryId>('pressure');
  const [inputValue, setInputValue] = useState('1');
  const [fromId, setFromId] = useState('bar');
  const [toId, setToId] = useState('kilopascal');
  const [copied, setCopied] = useState(false);

  const category = CATEGORIES.find(item => item.id === categoryId) ?? CATEGORIES[0];
  const from = category.units.find(unit => unit.id === fromId) ?? category.units[0];
  const to = category.units.find(unit => unit.id === toId) ?? category.units[1] ?? category.units[0];
  const parsedValue = Number(inputValue.replace(',', '.'));
  const isValid = inputValue.trim() !== '' && Number.isFinite(parsedValue);
  const result = useMemo(
    () => isValid ? calculate(parsedValue, from, to) : null,
    [isValid, parsedValue, from, to],
  );
  const formula = useMemo(() => getFormula(category.id, from, to), [category.id, from, to]);

  const changeCategory = (nextCategory: ConverterCategory) => {
    setCategoryId(nextCategory.id);
    setFromId(nextCategory.defaultFrom);
    setToId(nextCategory.defaultTo);
    setCopied(false);
  };

  const swapUnits = () => {
    setFromId(to.id);
    setToId(from.id);
    if (result !== null) setInputValue(String(result));
    setCopied(false);
  };

  const copyResult = async () => {
    if (result === null) return;
    await navigator.clipboard.writeText(`${formatNumber(result)} ${to.symbol}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="flex min-h-full w-full items-center justify-center bg-transparent px-3 py-5 font-sans sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-[676px] overflow-visible rounded-[34px] border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,.18)] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:shadow-[0_24px_70px_rgba(0,0,0,.45)]">
        <header className="flex h-[82px] items-center justify-between rounded-t-[33px] bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 px-5 text-white sm:px-7">
          <h2 className="text-[20px] font-semibold tracking-[-0.025em]">Konversi Unit</h2>
          <Dropdown
            ariaLabel="Pilih kategori konversi"
            value={category.id}
            options={CATEGORIES.map(item => ({ value: item.id, label: item.label, description: item.description }))}
            onChange={nextId => {
              const nextCategory = CATEGORIES.find(item => item.id === nextId);
              if (nextCategory) changeCategory(nextCategory);
            }}
            buttonClassName="min-w-[150px] !border-white/35 !bg-white/15 !text-white hover:!border-white/60 hover:!bg-white/25 focus-visible:!ring-white/35 dark:!border-white/35 dark:!bg-white/15 dark:!text-white dark:hover:!border-white/60 dark:hover:!bg-white/25 [&>svg]:!text-white"
            menuClassName="w-[286px]"
          />
        </header>

        <div className="flex flex-col p-4 sm:p-5">
          <div className="min-h-[184px] rounded-[23px] border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-800/70 dark:bg-blue-950/30 sm:p-6">
            <label htmlFor="converter-input" className="block text-[13px] font-semibold uppercase tracking-[0.04em] text-blue-700 dark:text-blue-300">
              Nilai awal
            </label>
            <div className="mt-3 flex items-center gap-4">
              <input
                id="converter-input"
                type="text"
                inputMode="decimal"
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent text-[42px] font-semibold leading-none tracking-[-0.04em] text-slate-950 outline-none placeholder:text-blue-300 dark:text-white dark:placeholder:text-blue-700 sm:text-[47px]"
              />
              <Dropdown
                ariaLabel="Dari satuan"
                value={from.id}
                options={category.units.map(unit => ({ value: unit.id, label: unit.symbol, description: unit.label }))}
                onChange={setFromId}
                buttonClassName="h-14 min-w-[115px] border-blue-300 text-[18px] text-blue-700 hover:border-blue-500 dark:border-blue-700 dark:text-blue-200"
                menuClassName="w-[247px]"
              />
            </div>
            <p className={`mt-4 text-[15px] ${isValid ? 'text-blue-700/70 dark:text-blue-300/75' : 'text-red-700 dark:text-red-400'}`}>
              {isValid ? from.label : 'Masukkan angka yang valid'}
            </p>
          </div>

          <button
            type="button"
            onClick={swapUnits}
            aria-label="Tukar satuan"
            title="Tukar satuan"
            className="relative z-10 -my-4 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 text-white shadow-[0_6px_18px_rgba(37,99,235,.38)] transition-transform hover:rotate-180 hover:from-cyan-400 hover:to-indigo-700 active:scale-95 dark:shadow-[0_6px_20px_rgba(34,211,238,.28)]"
          >
            <ArrowDownUp className="h-5 w-5" />
          </button>

          <div className="min-h-[184px] rounded-[23px] border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-800/70 dark:bg-emerald-950/25 sm:p-6">
            <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-emerald-700 dark:text-emerald-300">Hasil</div>
            <div className="mt-3 flex items-center gap-4">
              <output
                aria-live="polite"
                className="min-w-0 flex-1 break-all text-[42px] font-semibold leading-none tracking-[-0.04em] text-emerald-950 dark:text-emerald-100 sm:text-[47px]"
              >
                {result === null ? '—' : formatNumber(result)}
              </output>
              <Dropdown
                ariaLabel="Ke satuan"
                value={to.id}
                options={category.units.map(unit => ({ value: unit.id, label: unit.symbol, description: unit.label }))}
                onChange={setToId}
                buttonClassName="h-14 min-w-[115px] border-emerald-300 text-[18px] text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:border-emerald-500"
                menuClassName="w-[247px]"
              />
            </div>
            <p className="mt-4 text-[15px] text-emerald-700/70 dark:text-emerald-300/75">{to.label}</p>
          </div>

          <dl className="mt-5 divide-y divide-indigo-200 rounded-[23px] border border-indigo-200 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 px-5 py-2 text-[15px] dark:divide-indigo-800/60 dark:border-indigo-800/70 dark:from-cyan-950/25 dark:via-blue-950/25 dark:to-indigo-950/30 sm:px-6">
            <div className="flex items-center justify-between gap-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400">Kategori</dt>
              <dd className="font-semibold text-blue-700 dark:text-cyan-300">{category.label}</dd>
            </div>
            <div className="flex items-center justify-between gap-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400">Rasio</dt>
              <dd className="min-w-0 truncate text-right font-semibold text-indigo-700 dark:text-indigo-300" title={formula}>{formula}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={copyResult}
            disabled={result === null}
            className="mt-5 h-[62px] w-full rounded-[19px] bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-[17px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-600 hover:shadow-blue-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:from-cyan-500 dark:via-blue-500 dark:to-indigo-600 dark:text-white"
          >
            {copied ? 'HASIL TERSALIN' : 'SALIN HASIL'}
          </button>
        </div>
      </div>
    </section>
  );
};
