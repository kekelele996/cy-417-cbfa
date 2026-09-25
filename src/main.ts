import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './style.css';
import App from './App.vue';
import router from './router';
import { useTripStore } from './stores/tripStore';
import { useDayPlanStore } from './stores/dayPlanStore';

const pinia = createPinia();
// 旧版本旅行没有每日额度，启动时按总预算均摊回填
useDayPlanStore(pinia).backfillTrips(useTripStore(pinia).trips);

createApp(App).use(pinia).use(router).use(ElementPlus).mount('#app');
