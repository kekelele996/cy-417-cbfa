<template>
  <article class="trip-card">
    <div>
      <strong>{{ trip.title }}</strong>
      <p class="muted">{{ trip.destination }} · {{ formatDate(trip.start_date) }} - {{ formatDate(trip.end_date) }}</p>
    </div>
    <el-tag>{{ tripStatusText[trip.status] }}</el-tag>
    <p>预算 {{ formatCurrency(trip.budget, trip.currency) }} · 同行 {{ trip.members.join('、') }}</p>
    <div class="day-budgets">
      <DayBudgetLine v-for="day in days" :key="day.id" :day="day" :spots="spotStore.spots" />
      <p v-if="!days.length" class="muted">还没有每日行程。</p>
    </div>
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
import { useDayPlanStore } from '../../stores/dayPlanStore';
import { useSpotStore } from '../../stores/spotStore';
import DayBudgetLine from './DayBudgetLine.vue';
const props = defineProps<{ trip: Trip }>();
defineEmits<{ open: [id: string]; remove: [id: string] }>();
const dayPlanStore = useDayPlanStore();
const spotStore = useSpotStore();
const days = computed(() => dayPlanStore.dayPlans.filter((day) => day.trip_id === props.trip.id).sort((a, b) => a.day_index - b.day_index));
</script>
<style scoped>
.trip-card { background: #fff; border: 1px solid #dbe7cf; border-radius: 8px; padding: 18px; }
.day-budgets { margin: 8px 0; }
</style>
