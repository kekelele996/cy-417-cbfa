<template>
  <section class="band">
    <h3>第 {{ day.day_index }} 天 · {{ day.date }}</h3>
    <DayBudgetLine :day="day" :spots="spots" />
    <div v-if="editableBudget" class="budget-edit">
      <span class="muted">调整当日额度</span>
      <el-input-number :model-value="day.budget" :min="0" :step="50" @change="onBudgetChange" />
    </div>
    <ol>
      <li v-for="item in day.items" :key="item.spot_id + item.start_time">
        <strong>{{ spotName(item.spot_id) }}</strong>
        <span class="muted">{{ item.start_time }}-{{ item.end_time }} · {{ transportText[item.transport] }} · {{ item.note }}</span>
      </li>
    </ol>
    <p v-if="!day.items.length" class="muted">这一天还没有安排。</p>
  </section>
</template>
<script setup lang="ts">
import type { DayPlan } from '../../models/dayPlan';
import type { Spot } from '../../models/spot';
import { transportText } from '../../utils/formatters';
import DayBudgetLine from './DayBudgetLine.vue';
const props = defineProps<{ day: DayPlan; spots: Spot[]; editableBudget?: boolean }>();
const emit = defineEmits<{ changeBudget: [value: number] }>();
const spotName = (id: string) => props.spots.find((spot) => spot.id === id)?.name || '未知景点';
const onBudgetChange = (value: number | undefined) => { if (typeof value === 'number') emit('changeBudget', value); };
</script>
<style scoped>
.budget-edit { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
</style>
