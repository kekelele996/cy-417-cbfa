<template>
  <main class="page">
    <h1>行程编排</h1>
    <section class="band">
      <p class="muted">拖拽排序由 SortableJS 接管；预算计算会同步影响详情页。挪动景点时若目标天额度不足将不会写入。</p>
      <div ref="listEl">
        <div v-for="(spot, index) in daySpots" :key="spot.id" class="move-row">
          <SpotMiniCard :spot="spot" />
          <div class="move-ctrl">
            <el-select v-model="moveTargets[index]" placeholder="移到第几天" style="width: 130px">
              <el-option v-for="n in dayCount" :key="n" :label="'第 ' + n + ' 天'" :value="n" :disabled="n === dayIndex" />
            </el-select>
            <el-button @click="move(index)">移动</el-button>
          </div>
        </div>
      </div>
    </section>
    <DayTimeline v-if="day" :day="day" :spots="spotStore.spots" />
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Sortable, { type SortableEvent } from 'sortablejs';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { dateOfDayIndex, listDatesBetween } from '../utils/formatters';
import SpotMiniCard from '../components/common/SpotMiniCard.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
const route = useRoute();
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();
const listEl = ref<HTMLElement>();
const tripId = String(route.params.tripId);
const dayIndex = Number(route.params.dayIndex || 1);
const trip = computed(() => tripStore.trips.find((item) => item.id === tripId));
const dayCount = computed(() => (trip.value ? listDatesBetween(trip.value.start_date, trip.value.end_date).length : 1));
const day = computed(() => dayPlanStore.ensureDay(tripId, dayIndex, trip.value ? dateOfDayIndex(trip.value.start_date, dayIndex) : undefined));
const daySpots = computed(() => day.value.items.map((item) => spotStore.spots.find((spot) => spot.id === item.spot_id)).filter(Boolean) as any[]);
const moveTargets = ref<Record<number, number>>({});
function move(index: number) {
  const target = moveTargets.value[index];
  if (!target || !trip.value) return;
  dayPlanStore.moveSpot(trip.value, dayIndex, target, index);
}
onMounted(() => {
  if (listEl.value) {
    new Sortable(listEl.value, {
      animation: 150,
      onEnd: (evt: SortableEvent) => dayPlanStore.reorder(tripId, dayIndex, evt.oldIndex || 0, evt.newIndex || 0),
    });
  }
});
</script>
<style scoped>
.move-row { display: flex; align-items: center; gap: 8px; }
.move-row :deep(.mini) { flex: 1; }
.move-ctrl { display: flex; gap: 6px; margin-bottom: 8px; }
</style>
