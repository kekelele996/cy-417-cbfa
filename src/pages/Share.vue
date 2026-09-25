<template>
  <main class="page">
    <template v-if="trip">
      <TripHeader :trip="trip" />
      <section class="band summary">
        <p>
          总预算 {{ formatCurrency(trip.budget, trip.currency) }} ·
          各天额度合计 {{ formatCurrency(stats.budget.allocated, trip.currency) }} ·
          机动余额
          <strong :class="stats.reserve < 0 ? 'over-text' : ''">{{ formatCurrency(stats.reserve, trip.currency) }}</strong>
        </p>
        <p>
          已用 {{ formatCurrency(stats.budget.spent, trip.currency) }} ·
          总剩余 {{ formatCurrency(stats.budget.remaining, trip.currency) }}
        </p>
      </section>
      <DayTimeline v-for="day in days" :key="day.id" :day="day" :spots="spotStore.spots" :currency="trip.currency" />
      <el-button type="primary" @click="copyText">复制行程文本</el-button>
    </template>
    <EmptyState v-else title="没有可分享的行程" description="请从行程详情进入分享预览。" />
  </main>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { useTripStats } from '../hooks/useTripStats';
import TripHeader from '../components/common/TripHeader.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import EmptyState from '../components/common/EmptyState.vue';
import { formatCurrency } from '../utils/formatters';

const route = useRoute();
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();

const trip = computed(() => {
  const id = String(route.query.trip || '');
  return tripStore.trips.find((item) => item.id === id) || tripStore.trips[0];
});
const days = computed(() => (trip.value ? dayPlanStore.tripDays(trip.value.id) : []));
const statsRef = useTripStats(trip, dayPlanStore.dayPlans, spotStore.spots);
const stats = computed(() =>
  statsRef.value ?? { reserve: 0, perDay: [], budget: { spent: 0, remaining: 0, allocated: 0, reserve: 0, warning: '' } },
);

function copyText() {
  if (!trip.value) return;
  const lines = [
    `TripWeaver 行程单：${trip.value.title}`,
    `总预算 ${formatCurrency(trip.value.budget, trip.value.currency)}，机动余额 ${formatCurrency(stats.value.reserve, trip.value.currency)}`,
    ...days.value.map((day) => {
      const perDay = stats.value.perDay?.find((item) => item.day_index === day.day_index);
      return `第 ${day.day_index} 天：额度 ${perDay?.budget ?? 0} / 已用 ${perDay?.spent ?? 0} / 剩余 ${perDay?.remaining ?? 0}`;
    }),
  ];
  navigator.clipboard?.writeText(lines.join('\n'));
}
</script>
<style scoped>
.summary { margin: 14px 0; }
.over-text { color: #d9480f; }
</style>
