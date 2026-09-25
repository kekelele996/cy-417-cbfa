<template>
  <p class="day-budget-line" :class="{ over: status.over }">
    第 {{ day.day_index }} 天 · 额度 {{ formatCurrency(status.budget) }} · 已用 {{ formatCurrency(status.used) }} · 剩余 {{ formatCurrency(status.remaining) }}
  </p>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { DayPlan } from '../../models/dayPlan';
import type { Spot } from '../../models/spot';
import { dayBudgetStatus } from '../../utils/budgetCalculator';
import { formatCurrency } from '../../utils/formatters';
const props = defineProps<{ day: DayPlan; spots: Spot[] }>();
const status = computed(() => dayBudgetStatus(props.day, props.spots));
</script>
<style scoped>
.day-budget-line { margin: 4px 0; font-size: 13px; color: #4a5d43; }
.day-budget-line.over { color: #c45656; font-weight: 600; }
</style>
