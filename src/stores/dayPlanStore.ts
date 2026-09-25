import { defineStore } from 'pinia';
import type { DayPlan, DayPlanItem } from '../models/dayPlan';
import { createDayPlan, normalizeDayPlan } from '../models/dayPlan';
import type { Spot } from '../models/spot';
import type { Trip } from '../models/trip';
import { dayPlanApi } from '../api/dayPlanApi';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';
import { listTripDates } from '../utils/formatters';
import { checkAssignSpot, checkDayAllocation } from '../utils/budgetCalculator';

export interface SyncResult {
  /** 缩短时仍有景点、不能删除的日期 */
  blocked: { day_index: number; itemCount: number }[];
  added: number;
}

export const useDayPlanStore = defineStore('dayPlan', {
  state: () => ({ dayPlans: dayPlanApi.list() as DayPlan[] }),
  actions: {
    persist() {
      this.dayPlans = this.dayPlans.map(normalizeDayPlan);
      dayPlanApi.save(this.dayPlans);
    },
    tripDays(tripId: string) {
      return this.dayPlans
        .filter((day) => day.trip_id === tripId)
        .sort((a, b) => a.day_index - b.day_index);
    },
    ensureDay(tripId: string, dayIndex = 1, date = new Date().toISOString().slice(0, 10), budget = 0) {
      let day = this.dayPlans.find((item) => item.trip_id === tripId && item.day_index === dayIndex);
      if (!day) {
        day = createDayPlan(tripId, dayIndex, date, budget);
        this.dayPlans.push(day);
        this.persist();
      }
      return day;
    },
    /** 新建旅行时按总预算均摊初始化每日额度 */
    initTripDays(trip: Trip) {      const dates = listTripDates(trip.start_date, trip.end_date);
      const base = Math.floor(trip.budget / dates.length);
      const remainder = trip.budget - base * dates.length;
      dates.forEach((date, i) => {
        if (!this.dayPlans.some((day) => day.trip_id === trip.id && day.day_index === i + 1)) {
          this.dayPlans.push(createDayPlan(trip.id, i + 1, date, base + (i < remainder ? 1 : 0)));
        }
      });
      this.persist();
    },
    /** 旧数据回填：没有任何 DayPlan 的旅行，按总预算均摊补出每天额度 */
    backfillTrips(trips: Trip[]) {
      let changed = false;
      trips.forEach((trip) => {
        if (!this.dayPlans.some((day) => day.trip_id === trip.id)) {
          this.initTripDays(trip);
          changed = true;
        }
      });
      return changed;
    },
    /**
     * 日期变更同步：
     * - 延长：自动补齐新日期，新天按机动余额均摊额度（不动旧天）；
     * - 缩短：若待删日期里有景点，整体拒绝（不删任何一天，行程/额度保留）。
     */
    syncTripDays(trip: Trip): SyncResult {
      const existing = this.tripDays(trip.id);
      const dates = listTripDates(trip.start_date, trip.end_date);
      const blocked = existing
        .filter((day) => day.day_index > dates.length && day.items.length > 0)
        .map((day) => ({ day_index: day.day_index, itemCount: day.items.length }));
      if (blocked.length) {
        blocked
          .slice()
          .sort((a, b) => a.day_index - b.day_index)
          .forEach((item) => toast.fail(messages.dayBudgetShortenBlocked(item.day_index, item.itemCount)));
        return { blocked, added: 0 };
      }
      // 缩短：删除尾部空天
      this.dayPlans = this.dayPlans.filter(
        (day) => !(day.trip_id === trip.id && day.day_index > dates.length),
      );
      // 延长：补齐新天，额度取机动余额在新天之间均摊（保证合计不超过总预算）
      const addedDays = dates
        .map((date, i) => ({ date, index: i + 1 }))
        .filter(({ index }) => !this.dayPlans.some((day) => day.trip_id === trip.id && day.day_index === index));
      const allocated = this.tripDays(trip.id).reduce((sum, day) => sum + day.budget, 0);
      const pool = Math.max(0, trip.budget - allocated);
      const base = addedDays.length ? Math.floor(pool / addedDays.length) : 0;
      const remainder = addedDays.length ? pool - base * addedDays.length : 0;
      addedDays.forEach(({ date, index }, i) => {
        this.dayPlans.push(createDayPlan(trip.id, index, date, base + (i < remainder ? 1 : 0)));
      });
      // 修正所有天的日期与 trip 日期对齐（额度不变）
      dates.forEach((date, i) => {
        const day = this.dayPlans.find((item) => item.trip_id === trip.id && item.day_index === i + 1);
        if (day && day.date !== date) day.date = date;
      });
      if (addedDays.length) toast.ok(messages.dayBudgetFilled(addedDays.length));
      this.persist();
      return { blocked: [], added: addedDays.length };
    },
    /** 调整某天额度：所有天额度合计不能超过总预算，超出则不写入 */
    setDayBudget(trip: Trip, dayIndex: number, budget: number): boolean {
      const value = Math.max(0, Math.round(budget || 0));
      const days = this.tripDays(trip.id);
      const check = checkDayAllocation(trip, days, dayIndex, value);
      if (!check.ok) {
        toast.fail(check.warning);
        return false;
      }
      const day = days.find((item) => item.day_index === dayIndex);
      if (!day) return false;
      day.budget = value;
      this.persist();
      toast.ok(messages.allocationSaved);
      return true;
    },
    /** 安排景点到某天：加入后当天已用不得超过当天额度，否则不写入 */
    addSpot(tripId: string, spotId: string, spots: Spot[], dayIndex = 1): boolean {
      const day = this.ensureDay(tripId, dayIndex);
      const check = checkAssignSpot(day, spots, spotId);
      if (!check.ok) {
        toast.fail(check.warning);
        return false;
      }
      const item: DayPlanItem = { spot_id: spotId, start_time: '10:00', end_time: '12:00', note: '现场调整', transport: 'metro' };
      day.items.push(item);
      this.persist();
      toast.ok(messages.spotAdded);
      return true;
    },
    /** 挪动景点：目标天加入后会超额则整体不执行，原行程与额度保留 */
    moveSpot(tripId: string, fromIndex: number, toIndex: number, itemIndex: number, spots: Spot[]): boolean {
      if (fromIndex === toIndex) return true;
      const from = this.tripDays(tripId).find((day) => day.day_index === fromIndex);
      const to = this.tripDays(tripId).find((day) => day.day_index === toIndex);
      const moved = from?.items[itemIndex];
      if (!from || !to || !moved) return false;
      const check = checkAssignSpot(to, spots, moved.spot_id);
      if (!check.ok) {
        toast.fail(check.warning);
        return false;
      }
      from.items.splice(itemIndex, 1);
      to.items.push(moved);
      this.persist();
      toast.ok(messages.spotAdded);
      return true;
    },
    reorder(tripId: string, dayIndex: number, from: number, to: number) {
      const day = this.ensureDay(tripId, dayIndex);
      const [moved] = day.items.splice(from, 1);
      if (moved) day.items.splice(to, 0, moved);
      this.persist();
    },
  },
});
