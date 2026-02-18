export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

export const getDelayDiff = (target: Date, current: Date): string => {
  const diffMs = current.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins <= 0) return "ON TIME";
  
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return `${h > 0 ? h + 'h ' : ''}${m}m DELAY`;
};