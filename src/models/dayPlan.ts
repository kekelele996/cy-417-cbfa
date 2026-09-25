export interface DayPlanItem {
  spot_id: string;
  start_time: string;
  end_time: string;
  note: string;
  transport: 'walk' | 'metro' | 'taxi' | 'train';
}

export interface DayPlan {
  id: string;
  trip_id: string;
  day_index: number;
  date: string;
  items: DayPlanItem[];
  /** 当天额度（每日预算），未设置时视为 0 */
  budget: number;
}

export function createDayPlan(tripId: string, dayIndex: number, date: string, budget = 0): DayPlan {
  return {
    id: crypto.randomUUID(),
    trip_id: tripId,
    day_index: dayIndex,
    date,
    items: [],
    budget,
  };
}

/** 兼容旧数据：v1 数据没有 budget 字段，读取时补齐为 0 */
export function normalizeDayPlan(day: Partial<DayPlan>): DayPlan {
  return {
    id: day.id as string,
    trip_id: day.trip_id as string,
    day_index: day.day_index as number,
    date: day.date as string,
    items: Array.isArray(day.items) ? day.items : [],
    budget: typeof day.budget === 'number' ? day.budget : 0,
  };
}
