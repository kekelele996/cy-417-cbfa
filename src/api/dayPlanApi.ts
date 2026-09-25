import type { DayPlan } from '../models/dayPlan';
import { STORAGE_KEYS } from '../constants/storageVersion';
import { loadLocal, saveLocal } from '../utils/storage';

export const dayPlanApi = {
  list: () => loadLocal<DayPlan[]>(STORAGE_KEYS.dayPlans, []).map((day) => ({ ...day, budget: day.budget ?? 0 })),
  save: (items: DayPlan[]) => saveLocal(STORAGE_KEYS.dayPlans, items),
};
