import type { ItemConfig, ScheduleItem } from '../types';

type OpenModeReminderItem = Pick<ScheduleItem, 'startTime' | 'status'> & {
  config?: Pick<ItemConfig, 'mode'>;
};

export const shouldShowOpenModeReminder = (
  item: OpenModeReminderItem,
  now: Date,
): boolean => (
  item.config?.mode === 'OPEN' &&
  item.status === 'future' &&
  item.startTime.getTime() > now.getTime()
);
