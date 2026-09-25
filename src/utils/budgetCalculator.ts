import type { DayPlan } from '../models/dayPlan';
import type { Spot } from '../models/spot';
import type { Trip } from '../models/trip';
import { messages } from '../constants/messages';

export function calcTripCost(dayPlans: DayPlan[], spots: Spot[]) {
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
  return dayPlans.reduce((sum, day) => {
    return sum + day.items.reduce((inner, item) => inner + (spotMap.get(item.spot_id)?.price || 0), 0);
  }, 0);
}

export function budgetStatus(trip: Trip, dayPlans: DayPlan[], spots: Spot[]) {
  const spent = calcTripCost(dayPlans, spots);
  return { spent, remaining: trip.budget - spent, warning: spent > trip.budget ? messages.budgetExceeded : '' };
}

/** 当天已用金额：该天所有景点价格之和 */
export function calcDayCost(day: DayPlan, spots: Spot[]) {
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
  return day.items.reduce((sum, item) => sum + (spotMap.get(item.spot_id)?.price || 0), 0);
}

/** 每日额度合计：所有天 budget 相加 */
export function allocatedBudget(dayPlans: DayPlan[]) {
  return dayPlans.reduce((sum, day) => sum + (day.budget || 0), 0);
}

/** 机动余额：总预算中尚未分摊到每天的部分 */
export function flexibleBudget(trip: Trip, dayPlans: DayPlan[]) {
  return trip.budget - allocatedBudget(dayPlans);
}

/** 某一天的额度 / 已用 / 剩余 */
export function dayBudgetStatus(day: DayPlan, spots: Spot[]) {
  const budget = day.budget || 0;
  const used = calcDayCost(day, spots);
  return { budget, used, remaining: budget - used, over: used > budget };
}

/** 调整某天额度前校验：所有天额度合计 + 机动余额不能超过总预算 */
export function checkDayBudgetChange(trip: Trip, dayPlans: DayPlan[], dayId: string, next: number) {
  const others = dayPlans.filter((day) => day.trip_id === trip.id && day.id !== dayId);
  const allocated = allocatedBudget(others) + next;
  const over = allocated - trip.budget;
  return { ok: over <= 0, over: Math.max(0, over), allocated };
}

/** 安排/挪动景点前校验：当天已用 + 新景点价格不能超过当天额度 */
export function checkSpotFit(day: DayPlan, spots: Spot[], price: number) {
  const used = calcDayCost(day, spots);
  const shortage = used + price - (day.budget || 0);
  return { ok: shortage <= 0, shortage: Math.max(0, shortage), used };
}
