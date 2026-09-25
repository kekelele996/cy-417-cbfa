import dayjs from 'dayjs';
import { SpotCategory } from '../constants/spot';
import { TripStatus } from '../constants/trip';

export const spotCategoryText: Record<SpotCategory, string> = {
  [SpotCategory.NATURE]: '自然风光',
  [SpotCategory.CULTURE]: '人文历史',
  [SpotCategory.FOOD]: '美食购物',
  [SpotCategory.ENTERTAINMENT]: '娱乐休闲',
};
export const tripStatusText: Record<TripStatus, string> = {
  [TripStatus.PLANNING]: '规划中',
  [TripStatus.ONGOING]: '进行中',
  [TripStatus.FINISHED]: '已结束',
};
export const transportText: Record<string, string> = { walk: '步行', metro: '地铁', taxi: '出租', train: '火车' };
export const formatDate = (value: string) => dayjs(value).format('YYYY-MM-DD');
export const listDatesBetween = (start: string, end: string) => {
  const dates: string[] = [];
  let cursor = dayjs(start);
  const last = dayjs(end);
  if (!cursor.isValid() || !last.isValid() || cursor.isAfter(last, 'day')) return dates;
  while (cursor.isBefore(last, 'day') || cursor.isSame(last, 'day')) {
    dates.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  return dates;
};
export const dateOfDayIndex = (start: string, dayIndex: number) => dayjs(start).add(Math.max(0, dayIndex - 1), 'day').format('YYYY-MM-DD');
export const formatCurrency = (value: number, currency = 'CNY') => new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(value);

