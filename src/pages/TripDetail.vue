<template>
  <main class="page" v-if="trip">
    <TripHeader :trip="trip" />
    <div class="toolbar">
      <el-button type="primary" @click="router.push('/spots')">添加景点</el-button>
      <el-button @click="router.push('/planner/' + trip.id + '/1')">编排第 1 天</el-button>
      <el-button @click="router.push('/share')">分享预览</el-button>
    </div>
    <section class="band">
      <strong>日期与每日预算</strong>
      <div class="toolbar">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
        <el-button type="primary" @click="applyDates">应用日期</el-button>
      </div>
      <p class="muted">总预算 {{ formatCurrency(trip.budget, trip.currency) }} · 每日额度合计 {{ formatCurrency(allocated, trip.currency) }} · 机动余额 {{ formatCurrency(flexible, trip.currency) }}</p>
      <p v-if="flexible < 0" class="over-text">每日额度合计已超出总预算 {{ formatCurrency(-flexible, trip.currency) }}，请调低某天额度</p>
    </section>
    <section class="grid">
      <BudgetChart :spent="stats.value.budget.spent" :remaining="stats.value.budget.remaining" />
      <div class="band"><strong>统计</strong><p>天数 {{ stats.value.days }} · 景点 {{ stats.value.spotCount }}</p><p class="muted">{{ stats.value.budget.warning }}</p></div>
    </section>
    <DayTimeline v-for="day in tripDays" :key="day.id" :day="day" :spots="spotStore.spots" editable-budget @change-budget="(value: number) => changeBudget(day.day_index, value)" />
  </main>
  <main v-else class="page"><EmptyState title="旅行不存在" /></main>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { useTripStats } from '../hooks/useTripStats';
import { allocatedBudget, flexibleBudget } from '../utils/budgetCalculator';
import { formatCurrency } from '../utils/formatters';
import TripHeader from '../components/common/TripHeader.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import BudgetChart from '../components/common/BudgetChart.vue';
import EmptyState from '../components/common/EmptyState.vue';
const route = useRoute();
const router = useRouter();
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();
const trip = computed(() => tripStore.trips.find((item) => item.id === route.params.id));
const tripDays = computed(() => dayPlanStore.dayPlans.filter((day) => day.trip_id === route.params.id).sort((a, b) => a.day_index - b.day_index));
const stats = computed(() => trip.value ? useTripStats(trip.value, dayPlanStore.dayPlans, spotStore.spots) : { value: { days: 0, spotCount: 0, budget: { spent: 0, remaining: 0, warning: '' } } });
const dateRange = ref<[string, string]>([trip.value?.start_date || '', trip.value?.end_date || '']);
const allocated = computed(() => allocatedBudget(tripDays.value));
const flexible = computed(() => (trip.value ? flexibleBudget(trip.value, tripDays.value) : 0));
function applyDates() {
  if (!trip.value || !dateRange.value?.[0] || !dateRange.value?.[1]) return;
  const ok = tripStore.updateTripDates(trip.value.id, dateRange.value[0], dateRange.value[1]);
  if (!ok) dateRange.value = [trip.value.start_date, trip.value.end_date];
}
function changeBudget(dayIndex: number, value: number) {
  if (trip.value) dayPlanStore.setDayBudget(trip.value, dayIndex, value);
}
</script>
<style scoped>
.over-text { color: #c45656; font-weight: 600; }
</style>
