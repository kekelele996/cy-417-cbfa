<template>
  <section class="band" :class="{ 'is-over': stat.over > 0 }">
    <div class="day-head">
      <h3>第 {{ day.day_index }} 天 · {{ day.date }}</h3>
      <div class="day-budget">
        <template v-if="editable">
          <span class="muted">当天额度</span>
          <el-input-number
            v-model="budgetDraft"
            :min="0"
            :step="50"
            size="small"
            @change="onBudgetChange"
          />
        </template>
        <template v-else>
          <span class="muted">当天额度</span>
          <strong>{{ formatCurrency(day.budget, currency) }}</strong>
        </template>
        <span class="muted">已用</span>
        <strong>{{ formatCurrency(stat.spent, currency) }}</strong>
        <span class="muted">剩余</span>
        <strong :class="stat.remaining < 0 ? 'over-text' : ''">{{ formatCurrency(stat.remaining, currency) }}</strong>
      </div>
    </div>
    <ol>
      <li v-for="(item, index) in day.items" :key="item.spot_id + item.start_time">
        <strong>{{ spotName(item.spot_id) }}</strong>
        <span class="muted">{{ item.start_time }}-{{ item.end_time }} · {{ transportText[item.transport] }} · {{ item.note }}</span>
        <el-button
          v-if="movable"
          link
          type="primary"
          size="small"
          @click="$emit('move', { fromIndex: day.day_index, itemIndex: index })"
        >挪动</el-button>
      </li>
    </ol>
    <p v-if="!day.items.length" class="muted">这一天还没有安排。</p>
    <p v-if="stat.over > 0" class="over-text">{{ stat.warning }}</p>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { DayPlan } from '../../models/dayPlan';
import type { Spot } from '../../models/spot';
import { transportText, formatCurrency } from '../../utils/formatters';
import { calcDayCost } from '../../utils/budgetCalculator';
import { messages } from '../../constants/messages';

const props = withDefaults(defineProps<{
  day: DayPlan;
  spots: Spot[];
  currency?: string;
  editable?: boolean;
  movable?: boolean;
}>(), { currency: 'CNY', editable: false, movable: false });

const emit = defineEmits<{
  budgetChange: [dayIndex: number, value: number];
  move: [payload: { fromIndex: number; itemIndex: number }];
}>();

const spotName = (id: string) => props.spots.find((spot) => spot.id === id)?.name || '未知景点';
const stat = computed(() => {
  const spent = calcDayCost(props.day, props.spots);
  const remaining = props.day.budget - spent;
  return { spent, remaining, over: Math.max(0, -remaining), warning: messages.dayBudgetExceeded(props.day.day_index, Math.max(0, -remaining)) };
});

function onBudgetChange(value: number | undefined) {
  emit('budgetChange', props.day.day_index, value || 0);
}

// 编辑被 store 拒绝（合计超总预算）时，输入框回滚为当前已保存额度
const budgetDraft = ref(props.day.budget);
watch(
  () => props.day.budget,
  (value) => {
    budgetDraft.value = value;
  },
);
</script>
<style scoped>
.is-over { border-color: #e6a23c; background: #fff7ec; }
.over-text { color: #d9480f; font-weight: 600; }
.day-head { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.day-budget { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
