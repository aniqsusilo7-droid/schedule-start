import { ReactorConfig } from './types';

export const REACTORS: ReactorConfig[] = [
  { id: 'S', name: 'Reactor S', label: 'S', color: 'bg-red-600', textColor: 'text-white', subLabel: '' },
  { id: 'T', name: 'Reactor T', label: 'T', color: 'bg-orange-500', textColor: 'text-white', subLabel: '' },
  { id: 'U', name: 'Reactor U', label: 'U', color: 'bg-yellow-300', textColor: 'text-black', subLabel: '' },
  { id: 'V', name: 'Reactor V', label: 'V', color: 'bg-green-600', textColor: 'text-white', subLabel: '' },
  { id: 'W', name: 'Reactor W', label: 'W', color: 'bg-indigo-600', textColor: 'text-white', subLabel: '' },
];

export const GRADE_COLORS: Record<string, string> = {
  SM: 'bg-indigo-600',
  SLK: 'bg-green-600',
  SLP: 'bg-orange-500',
  SE: 'bg-purple-600',
  SR: 'bg-red-600'
};
