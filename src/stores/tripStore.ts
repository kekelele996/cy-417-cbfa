import { defineStore } from 'pinia';
import dayjs from 'dayjs';
import { TripStatus } from '../constants/trip';
import type { Trip } from '../models/trip';
import { tripApi } from '../api/tripApi';
import { dayPlanApi } from '../api/dayPlanApi';
import { useDayPlanStore, type SyncResult } from './dayPlanStore';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';

export const useTripStore = defineStore('trip', {
  state: () => ({ trips: tripApi.list() as Trip[], statusFilter: 'all' as TripStatus | 'all' }),
  getters: {
    filteredTrips: (state) => state.statusFilter === 'all' ? state.trips : state.trips.filter((trip) => trip.status === state.statusFilter),
  },
  actions: {
    createTrip(title = '杭州周末慢旅行') {
      const trip: Trip = {
        id: crypto.randomUUID(),
        title,
        destination: '杭州',
        start_date: dayjs().format('YYYY-MM-DD'),
        end_date: dayjs().add(2, 'day').format('YYYY-MM-DD'),
        budget: 3200,
        currency: 'CNY',
        members: ['我', '朋友'],
        status: TripStatus.PLANNING,
        created_at: new Date().toISOString(),
      };
      this.trips.unshift(trip);
      tripApi.save(this.trips);
      // 每日额度与日期同步在 dayPlanStore 中维护
      useDayPlanStore().initTripDays(trip);
      toast.ok(messages.tripCreated);
      return trip.id;
    },
    /**
     * 更新旅行信息。日期变化时同步每日预算：
     * - 延长自动补齐；缩短前若某天有景点则拒绝（blocked 非空，本次不写入任何改动）。
     */
    updateTrip(id: string, patch: Partial<Omit<Trip, 'id' | 'created_at'>>): SyncResult & { ok: boolean } {
      const trip = this.trips.find((item) => item.id === id);
      if (!trip) return { ok: false, blocked: [], added: 0 };
      const next: Trip = { ...trip, ...patch };
      const dayPlanStore = useDayPlanStore();
      let dateResult: SyncResult = { blocked: [], added: 0 };
      // 先让 dayPlanStore 校验/同步日期；有不能删的日期则整体不写入
      if (patch.start_date !== undefined || patch.end_date !== undefined) {
        dateResult = dayPlanStore.syncTripDays(next);
        if (dateResult.blocked.length) return { ok: false, ...dateResult };
      }
      Object.assign(trip, patch);
      tripApi.save(this.trips);
      toast.ok(messages.tripUpdated);
      return { ok: true, ...dateResult };
    },
    removeTrip(id: string) {
      this.trips = this.trips.filter((trip) => trip.id !== id);
      tripApi.save(this.trips);
      // 连带清理每日行程与额度
      const dayPlanStore = useDayPlanStore();
      dayPlanStore.dayPlans = dayPlanStore.dayPlans.filter((day) => day.trip_id !== id);
      dayPlanApi.save(dayPlanStore.dayPlans);
      toast.ok(messages.tripDeleted);
    },
  },
});
