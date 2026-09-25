<template>
  <main class="page" v-if="trip">
    <TripHeader :trip="trip" />
    <div class="toolbar">
      <el-button type="primary" @click="router.push('/spots')">添加景点</el-button>
      <el-button @click="router.push('/planner/' + trip.id + '/1')">编排第 1 天</el-button>
      <el-button @click="router.push('/share?trip=' + trip.id)">分享预览</el-button>
    </div>

    <section class="band editor">
      <div class="toolbar">
        <label>总预算 <el-input-number v-model="budgetDraft" :min="0" :step="100" size="small" /></label>
        <label>开始日期 <el-date-picker v-model="startDraft" type="date" value-format="YYYY-MM-DD" size="small" /></label>
        <label>结束日期 <el-date-picker v-model="endDraft" type="date" value-format="YYYY-MM-DD" size="small" /></label>
        <el-button type="primary" @click="saveTrip">保存并同步每日额度</el-button>
      </div>
      <el-alert
        v-for="item in blockedDays"
        :key="item.day_index"
        class="alert"
        type="error"
        :closable="false"
        :title="`第 ${item.day_index} 天还有 ${item.itemCount} 个景点，不能删除该日期`"
        description="请先把该天景点挪动到其他天，再缩短日期。原行程与每日额度均已保留。"
      />
      <p class="muted">
        延长日期会自动补齐新天额度；缩短时若某天仍有景点会被拦截。
        所有天额度合计 <strong>{{ formatCurrency(stats.budget.allocated, trip.currency) }}</strong>，
        机动余额
        <strong :class="stats.reserve < 0 ? 'over-text' : ''">{{ formatCurrency(stats.reserve, trip.currency) }}</strong>
        （总预算 - 各天额度，不可为负）。
      </p>
    </section>

    <section class="grid">
      <BudgetChart :spent="stats.budget.spent" :remaining="stats.budget.remaining" />
      <div class="band">
        <strong>统计</strong>
        <p>天数 {{ stats.days }} · 景点 {{ stats.spotCount }}</p>
        <p>已用 {{ formatCurrency(stats.budget.spent, trip.currency) }} · 剩余 {{ formatCurrency(stats.budget.remaining, trip.currency) }}</p>
        <p class="muted" v-if="stats.budget.warning">{{ stats.budget.warning }}</p>
      </div>
    </section>

    <section class="day-list">
      <h3>每日额度</h3>
      <p class="muted">每天可单独调整额度、查看已用与剩余；超额的当天会高亮。</p>
      <DayTimeline
        v-for="day in tripDays"
        :key="day.id"
        :day="day"
        :spots="spotStore.spots"
        :currency="trip.currency"
        editable
        movable
        @budget-change="onBudgetChange"
        @move="goMove"
      />
    </section>
  </main>
  <main v-else class="page"><EmptyState title="旅行不存在" /></main>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { useTripStats } from '../hooks/useTripStats';
import TripHeader from '../components/common/TripHeader.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import BudgetChart from '../components/common/BudgetChart.vue';
import EmptyState from '../components/common/EmptyState.vue';
import { formatCurrency } from '../utils/formatters';

const route = useRoute();
const router = useRouter();
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();

const trip = computed(() => tripStore.trips.find((item) => item.id === route.params.id));
const tripDays = computed(() => (trip.value ? dayPlanStore.tripDays(trip.value.id) : []));
const statsRef = useTripStats(trip, dayPlanStore.dayPlans, spotStore.spots);
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

const budgetDraft = ref(0);
const startDraft = ref('');
const endDraft = ref('');
const blockedDays = ref<{ day_index: number; itemCount: number }[]>([]);

watch(
  trip,
  (value) => {
    if (value) {
      budgetDraft.value = value.budget;
      startDraft.value = value.start_date;
      endDraft.value = value.end_date;
      blockedDays.value = [];
    }
  },
  { immediate: true },
);

function saveTrip() {
  if (!trip.value) return;
  blockedDays.value = [];
  const result = tripStore.updateTrip(trip.value.id, {
    budget: Math.max(0, Math.round(budgetDraft.value || 0)),
    start_date: startDraft.value,
    end_date: endDraft.value,
  });
  if (!result.ok) {
    blockedDays.value = result.blocked;
    // 被拦截：恢复草稿为原值，原行程与额度保留
    budgetDraft.value = trip.value.budget;
    startDraft.value = trip.value.start_date;
    endDraft.value = trip.value.end_date;
  }
}

function onBudgetChange(dayIndex: number, value: number) {
  if (trip.value) dayPlanStore.setDayBudget(trip.value, dayIndex, value);
}

function goMove({ fromIndex }: { fromIndex: number; itemIndex: number }) {
  if (trip.value) router.push(`/planner/${trip.value.id}/${fromIndex}`);
}
</script>
<style scoped>
.editor { margin-bottom: 16px; }
.alert { margin: 10px 0; }
.over-text { color: #d9480f; }
.day-list { margin-top: 20px; display: grid; gap: 14px; }
</style>
