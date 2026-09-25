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
  /** 每日额度：当天可花费上限，受 Trip.budget 总预算约束 */
  budget: number;
  items: DayPlanItem[];
}
