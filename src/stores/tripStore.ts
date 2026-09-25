import { defineStore } from 'pinia';
import { TripStatus } from '../constants/trip';
import type { Trip } from '../models/trip';
import { tripApi } from '../api/tripApi';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';
import { useDayPlanStore } from './dayPlanStore';

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
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        budget: 3200,
        currency: 'CNY',
        members: ['我', '朋友'],
        status: TripStatus.PLANNING,
        created_at: new Date().toISOString(),
      };
      this.trips.unshift(trip);
      tripApi.save(this.trips);
      useDayPlanStore().seedTripDays(trip);
      toast.ok(messages.tripCreated);
      return trip.id;
    },
    /** 修改行程日期：延长自动补齐每日额度；缩短时若有景点则指出不能删的日期并保留原样 */
    updateTripDates(id: string, start: string, end: string) {
      const trip = this.trips.find((item) => item.id === id);
      if (!trip) return false;
      const result = useDayPlanStore().syncTripDates(trip, start, end);
      if (!result.ok) {
        toast.fail(messages.tripDatesBlocked(result.blocked.join('、')));
        return false;
      }
      trip.start_date = start;
      trip.end_date = end;
      tripApi.save(this.trips);
      toast.ok(messages.tripDatesUpdated);
      return true;
    },
    removeTrip(id: string) {
      this.trips = this.trips.filter((trip) => trip.id !== id);
      tripApi.save(this.trips);
      toast.ok(messages.tripDeleted);
    },
  },
});
