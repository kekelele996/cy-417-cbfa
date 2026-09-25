import { computed, type ComputedRef } from 'vue';
import type { Trip } from '../models/trip';
import type { DayPlan } from '../models/dayPlan';
import type { Spot } from '../models/spot';
import { budgetStatus, dayBudgetStats, reserveBalance } from '../utils/budgetCalculator';
import { tripDayCount } from '../utils/formatters';

export interface TripStats {
  days: number;
  spotCount: number;
  budget: ReturnType<typeof budgetStatus>;
  reserve: number;
  perDay: ReturnType<typeof dayBudgetStats>;
}

export function useTripStats(
  trip: ComputedRef<Trip | undefined>,
  dayPlans: ComputedRef<DayPlan[]> | DayPlan[],
  spots: ComputedRef<Spot[]> | Spot[],
): ComputedRef<TripStats | null> {
  return computed(() => {
    const current = trip.value;
    if (!current) return null;
    const plans = Array.isArray(dayPlans) ? dayPlans : dayPlans.value;
    const allSpots = Array.isArray(spots) ? spots : spots.value;
    const own = plans.filter((day) => day.trip_id === current.id);
    return {
      days: Math.max(1, own.length || tripDayCount(current.start_date, current.end_date)),
      spotCount: own.reduce((sum, day) => sum + day.items.length, 0),
      budget: budgetStatus(current, own, allSpots),
      reserve: reserveBalance(current, own),
      perDay: dayBudgetStats(own, allSpots),
    };
  });
}
