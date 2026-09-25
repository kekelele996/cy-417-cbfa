import { defineStore } from 'pinia';
import type { DayPlan, DayPlanItem } from '../models/dayPlan';
import type { Trip } from '../models/trip';
import { dayPlanApi } from '../api/dayPlanApi';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';
import { allocatedBudget, checkDayBudgetChange, checkSpotFit } from '../utils/budgetCalculator';
import { dateOfDayIndex, formatCurrency, listDatesBetween } from '../utils/formatters';
import { useSpotStore } from './spotStore';

export const useDayPlanStore = defineStore('dayPlan', {
  state: () => ({ dayPlans: dayPlanApi.list() as DayPlan[] }),
  actions: {
    ensureDay(tripId: string, dayIndex = 1, date = new Date().toISOString().slice(0, 10), budget = 0) {
      let day = this.dayPlans.find((item) => item.trip_id === tripId && item.day_index === dayIndex);
      if (!day) {
        day = { id: crypto.randomUUID(), trip_id: tripId, day_index: dayIndex, date, budget, items: [] };
        this.dayPlans.push(day);
      }
      return day;
    },
    /** 新建旅行时按日期范围生成每天行程，并把总预算均分为每日额度 */
    seedTripDays(trip: Trip) {
      const dates = listDatesBetween(trip.start_date, trip.end_date);
      const per = dates.length ? Math.floor(trip.budget / dates.length) : 0;
      dates.forEach((date, index) => {
        if (!this.dayPlans.some((day) => day.trip_id === trip.id && day.date === date)) {
          this.dayPlans.push({ id: crypto.randomUUID(), trip_id: trip.id, day_index: index + 1, date, budget: per, items: [] });
        }
      });
      dayPlanApi.save(this.dayPlans);
    },
    /**
     * 行程日期变化：
     * - 延长：为新增日期自动补齐 DayPlan，每日额度均分当前机动余额
     * - 缩短：若被删日期已有景点，指出这些日期并整体保留不删
     */
    syncTripDates(trip: Trip, start: string, end: string) {
      const dates = listDatesBetween(start, end);
      const mine = this.dayPlans.filter((day) => day.trip_id === trip.id);
      const blocked = mine.filter((day) => !dates.includes(day.date) && day.items.length > 0).map((day) => day.date);
      if (blocked.length) return { ok: false as const, blocked };
      this.dayPlans = this.dayPlans.filter((day) => day.trip_id !== trip.id || dates.includes(day.date));
      const existing = this.dayPlans.filter((day) => day.trip_id === trip.id);
      const missing = dates.filter((date) => !existing.some((day) => day.date === date));
      const flexible = trip.budget - allocatedBudget(existing);
      const per = missing.length ? Math.max(0, Math.floor(flexible / missing.length)) : 0;
      missing.forEach((date) => {
        this.dayPlans.push({ id: crypto.randomUUID(), trip_id: trip.id, day_index: 0, date, budget: per, items: [] });
      });
      this.dayPlans
        .filter((day) => day.trip_id === trip.id)
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((day, index) => { day.day_index = index + 1; });
      dayPlanApi.save(this.dayPlans);
      return { ok: true as const, blocked: [] as string[] };
    },
    /** 安排景点到某天：当天已用 + 景点价格超过当日额度则不写入 */
    addSpot(tripId: string, spotId: string, dayIndex = 1) {
      const spotStore = useSpotStore();
      const day = this.ensureDay(tripId, dayIndex);
      const price = spotStore.spots.find((spot) => spot.id === spotId)?.price || 0;
      const fit = checkSpotFit(day, spotStore.spots, price);
      if (!fit.ok) {
        toast.fail(messages.spotOverDayBudget(`额度 ${formatCurrency(day.budget)}，已用 ${formatCurrency(fit.used)}，本景点 ${formatCurrency(price)}，差额 ${formatCurrency(fit.shortage)}`));
        return false;
      }
      const item: DayPlanItem = { spot_id: spotId, start_time: '10:00', end_time: '12:00', note: '现场调整', transport: 'metro' };
      day.items.push(item);
      dayPlanApi.save(this.dayPlans);
      toast.ok(messages.spotAdded);
      return true;
    },
    /** 挪动景点到另一天：目标天额度不足则不写入，原行程保留 */
    moveSpot(trip: Trip, fromDayIndex: number, toDayIndex: number, itemIndex: number) {
      if (fromDayIndex === toDayIndex) return false;
      const spotStore = useSpotStore();
      const from = this.dayPlans.find((day) => day.trip_id === trip.id && day.day_index === fromDayIndex);
      const item = from?.items[itemIndex];
      if (!from || !item) return false;
      const to = this.ensureDay(trip.id, toDayIndex, dateOfDayIndex(trip.start_date, toDayIndex));
      const price = spotStore.spots.find((spot) => spot.id === item.spot_id)?.price || 0;
      const fit = checkSpotFit(to, spotStore.spots, price);
      if (!fit.ok) {
        toast.fail(messages.spotOverDayBudget(`第 ${toDayIndex} 天额度 ${formatCurrency(to.budget)}，已用 ${formatCurrency(fit.used)}，本景点 ${formatCurrency(price)}，差额 ${formatCurrency(fit.shortage)}`));
        return false;
      }
      from.items.splice(itemIndex, 1);
      to.items.push(item);
      dayPlanApi.save(this.dayPlans);
      toast.ok(messages.spotMoved);
      return true;
    },
    /** 调整某天额度：所有天额度合计 + 机动余额不能超过总预算，超出则提示差额且不保存 */
    setDayBudget(trip: Trip, dayIndex: number, value: number) {
      const day = this.ensureDay(trip.id, dayIndex, dateOfDayIndex(trip.start_date, dayIndex));
      const check = checkDayBudgetChange(trip, this.dayPlans, day.id, value);
      if (!check.ok) {
        toast.fail(messages.dayBudgetOverTotal(formatCurrency(check.over)));
        return false;
      }
      day.budget = value;
      dayPlanApi.save(this.dayPlans);
      toast.ok(messages.dayBudgetSaved);
      return true;
    },
    reorder(tripId: string, dayIndex: number, from: number, to: number) {
      const day = this.ensureDay(tripId, dayIndex);
      const [moved] = day.items.splice(from, 1);
      if (moved) day.items.splice(to, 0, moved);
      dayPlanApi.save(this.dayPlans);
    },
  },
});
