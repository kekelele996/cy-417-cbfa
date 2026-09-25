<template>
  <main class="page" v-if="day">
    <h1>行程编排</h1>
    <div class="toolbar">
      <el-select v-model="dayIndex" style="width: 160px" @change="onDayChange">
        <el-option v-for="d in days" :key="d.day_index" :label="`第 ${d.day_index} 天 · ${d.date}`" :value="d.day_index" />
      </el-select>
      <span class="muted">
        当天额度 {{ formatCurrency(day.budget, trip?.currency) }} ·
        已用 {{ formatCurrency(dayStat.spent, trip?.currency) }} ·
        剩余 <strong :class="dayStat.remaining < 0 ? 'over-text' : ''">{{ formatCurrency(dayStat.remaining, trip?.currency) }}</strong>
      </span>
    </div>
    <section class="band">
      <p class="muted">拖拽排序由 SortableJS 接管；挪动到别的天后若当天已用会超过额度，本次不写入。</p>
      <div ref="listEl">
        <div v-for="(entry, index) in dayItems" :key="entry.item.spot_id + index" class="planner-row">
          <SpotMiniCard :spot="entry.spot" />
          <div class="toolbar no-drag">
            <el-select v-model="moveTarget[index]" size="small" style="width: 150px">
              <el-option
                v-for="d in days.filter((d) => d.day_index !== dayIndex)"
                :key="d.day_index"
                :label="`挪到第 ${d.day_index} 天`"
                :value="d.day_index"
              />
            </el-select>
            <el-button size="small" @click="move(index)">挪动</el-button>
          </div>
        </div>
        <p v-if="!dayItems.length" class="muted">这一天还没有安排景点。</p>
      </div>
    </section>
    <DayTimeline :day="day" :spots="spotStore.spots" :currency="trip?.currency" />
  </main>
  <main v-else class="page"><EmptyState title="行程不存在" /></main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Sortable, { type SortableEvent } from 'sortablejs';
import { useSpotStore } from '../stores/spotStore';
import { useTripStore } from '../stores/tripStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import SpotMiniCard from '../components/common/SpotMiniCard.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import EmptyState from '../components/common/EmptyState.vue';
import { calcDayCost } from '../utils/budgetCalculator';
import { formatCurrency } from '../utils/formatters';

const route = useRoute();
const router = useRouter();
const spotStore = useSpotStore();
const tripStore = useTripStore();
const dayPlanStore = useDayPlanStore();
const listEl = ref<HTMLElement>();

const tripId = String(route.params.tripId);
const dayIndex = ref(Number(route.params.dayIndex || 1));
const moveTarget = ref<Record<number, number>>({});

const trip = computed(() => tripStore.trips.find((item) => item.id === tripId));
const days = computed(() => (trip.value ? dayPlanStore.tripDays(trip.value.id) : []));
const day = computed(() => days.value.find((d) => d.day_index === dayIndex.value));
const dayItems = computed(() =>
  day.value
    ? day.value.items
        .map((item) => ({ item, spot: spotStore.spots.find((spot) => spot.id === item.spot_id) }))
        .filter((entry) => entry.spot)
        .map((entry) => ({ ...entry, spot: entry.spot! }))
    : [],
);
const dayStat = computed(() => {
  if (!day.value) return { spent: 0, remaining: 0 };
  const spent = calcDayCost(day.value, spotStore.spots);
  return { spent, remaining: day.value.budget - spent };
});

function onDayChange(value: number) {
  router.replace(`/planner/${tripId}/${value}`);
}
function move(index: number) {
  const target = moveTarget.value[index];
  if (!target || !day.value) return;
  dayPlanStore.moveSpot(tripId, dayIndex.value, target, index, spotStore.spots);
}

let sortable: Sortable | null = null;
function bindSortable() {
  sortable?.destroy();
  if (listEl.value) {
    sortable = new Sortable(listEl.value, {
      animation: 150,
      filter: '.no-drag',
      preventOnFilter: false,
      onEnd: (evt: SortableEvent) => dayPlanStore.reorder(tripId, dayIndex.value, evt.oldIndex || 0, evt.newIndex || 0),
    });
  }
}
onMounted(bindSortable);
watch(dayIndex, bindSortable);
</script>
<style scoped>
.planner-row { display: grid; gap: 6px; }
.over-text { color: #d9480f; }
</style>
