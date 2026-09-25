<template>
  <article class="trip-card">
    <div>
      <strong>{{ trip.title }}</strong>
      <p class="muted">{{ trip.destination }} · {{ formatDate(trip.start_date) }} - {{ formatDate(trip.end_date) }}</p>
    </div>
    <el-tag>{{ tripStatusText[trip.status] }}</el-tag>
    <p>
      总预算 {{ formatCurrency(trip.budget, trip.currency) }} · 同行 {{ trip.members.join('、') }}<br />
      各天额度合计 {{ formatCurrency(stats.budget.allocated, trip.currency) }} ·
      机动余额
      <strong :class="stats.reserve < 0 ? 'over-text' : ''">{{ formatCurrency(stats.reserve, trip.currency) }}</strong>
    </p>
    <ul class="day-budget-list">
      <li v-for="day in stats.perDay" :key="day.day_index" :class="{ over: day.over > 0 }">
        第 {{ day.day_index }} 天：额度 {{ formatCurrency(day.budget, trip.currency) }} ·
        已用 {{ formatCurrency(day.spent, trip.currency) }} ·
        剩余 {{ formatCurrency(day.remaining, trip.currency) }}
      </li>
    </ul>
    <div class="toolbar">
      <el-button type="primary" @click="$emit('open', trip.id)">进入详情</el-button>
      <el-button @click="$emit('remove', trip.id)">删除</el-button>
    </div>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { Trip } from '../../models/trip';
import { formatCurrency, formatDate, tripStatusText } from '../../utils/formatters';
import { useSpotStore } from '../../stores/spotStore';
import { useDayPlanStore } from '../../stores/dayPlanStore';
import { useTripStats } from '../../hooks/useTripStats';

const props = defineProps<{ trip: Trip }>();
defineEmits<{ open: [id: string]; remove: [id: string] }>();

const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();
const statsRef = useTripStats(computed(() => props.trip), dayPlanStore.dayPlans, spotStore.spots);
const stats = computed(
  () =>
    statsRef.value ?? {
      days: 0,
      spotCount: 0,
      reserve: 0,
      budget: { spent: 0, remaining: 0, allocated: 0, reserve: 0, warning: '' },
      perDay: [],
    },
);
</script>
<style scoped>
.trip-card { background: #fff; border: 1px solid #dbe7cf; border-radius: 8px; padding: 18px; }
.day-budget-list { list-style: none; margin: 8px 0; padding: 0; font-size: 13px; color: #61706b; display: grid; gap: 4px; }
.day-budget-list .over { color: #d9480f; font-weight: 600; }
.over-text { color: #d9480f; }
</style>
