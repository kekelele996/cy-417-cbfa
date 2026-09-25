import type { DayPlan } from '../models/dayPlan';
import type { Spot } from '../models/spot';
import type { Trip } from '../models/trip';
import { messages } from '../constants/messages';

const spotPriceOf = (spots: Spot[], spotId: string) => spots.find((spot) => spot.id === spotId)?.price || 0;

/** 某一天景点已用金额 */
export function calcDayCost(day: DayPlan, spots: Spot[]) {
  return day.items.reduce((sum, item) => sum + spotPriceOf(spots, item.spot_id), 0);
}

/** 整段行程已用金额 */
export function calcTripCost(dayPlans: DayPlan[], spots: Spot[]) {
  return dayPlans.reduce((sum, day) => sum + calcDayCost(day, spots), 0);
}

export interface DayBudgetStat {
  day_index: number;
  budget: number;
  spent: number;
  remaining: number;
  over: number;
  warning: string;
}

/** 每天额度 / 已用 / 剩余（剩余可能为负，负数即已超额） */
export function dayBudgetStats(dayPlans: DayPlan[], spots: Spot[]): DayBudgetStat[] {
  return [...dayPlans]
    .sort((a, b) => a.day_index - b.day_index)
    .map((day) => {
      const spent = calcDayCost(day, spots);
      const over = Math.max(0, spent - day.budget);
      return {
        day_index: day.day_index,
        budget: day.budget,
        spent,
        remaining: day.budget - spent,
        over,
        warning: over > 0 ? messages.dayBudgetExceeded(day.day_index, over) : '',
      };
    });
}

/** 机动余额：总预算 - 所有天额度之和 */
export function reserveBalance(trip: Trip, dayPlans: DayPlan[]) {
  const allocated = dayPlans.reduce((sum, day) => sum + (day.budget || 0), 0);
  return trip.budget - allocated;
}

export interface DayAllocationCheck {
  ok: boolean;
  /** 新额度下，所有天额度合计相对总预算超出多少 */
  overTotal: number;
  warning: string;
}

/**
 * 调整某天额度前校验：所有天额度（含机动余额 0 的约束）不能超过总预算。
 * @param targetIndex 要调整的天；传 null 表示不针对具体某天（整体校验）
 */
export function checkDayAllocation(
  trip: Trip,
  dayPlans: DayPlan[],
  targetIndex: number | null,
  newBudget: number,
): DayAllocationCheck {
  const allocated = dayPlans.reduce(
    (sum, day) => sum + (day.day_index === targetIndex ? newBudget : day.budget || 0),
    0,
  );
  const overTotal = Math.max(0, allocated - trip.budget);
  return {
    ok: overTotal === 0,
    overTotal,
    warning: overTotal > 0 ? messages.allocationExceeded(overTotal) : '',
  };
}

/** 向某天新增/挪动一个景点的预检：加入后当天已用不能超过当天额度 */
export function checkAssignSpot(day: DayPlan, spots: Spot[], spotId: string): { ok: boolean; short: number; warning: string } {
  const nextSpent = calcDayCost(day, spots) + spotPriceOf(spots, spotId);
  const short = Math.max(0, nextSpent - day.budget);
  return { ok: short === 0, short, warning: short > 0 ? messages.assignBlocked(day.day_index, short) : '' };
}

export function budgetStatus(trip: Trip, dayPlans: DayPlan[], spots: Spot[]) {
  const spent = calcTripCost(dayPlans, spots);
  const allocated = dayPlans.reduce((sum, day) => sum + (day.budget || 0), 0);
  return {
    spent,
    remaining: trip.budget - spent,
    allocated,
    reserve: trip.budget - allocated,
    warning: spent > trip.budget ? messages.budgetExceeded : '',
  };
}
