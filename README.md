# TripWeaver 旅游行程规划助手

## 快速启动

```bash
pnpm install
pnpm dev
```

访问地址：http://localhost:18417

TripWeaver 是一款纯前端旅行规划应用，支持创建旅行、探索景点、编排每日行程、预算统计和分享预览。

## 主要功能

- 我的旅行：创建、筛选、删除旅行计划，卡片直接列出每天额度 / 已用 / 剩余。
- 行程详情：查看每日行程、预算图表和共享时间线；可修改行程日期并调整每日额度。
- 景点探索：按 SpotCategory 搜索和筛选，收藏并加入行程。
- 行程编排：SortableJS 拖拽排序，可把景点挪到另一天，实时影响预算计算。
- 分享预览：生成可复制的行程文本，行程单含每天额度 / 已用 / 剩余。

## 每日预算规则

- 旅行只有总预算，每日额度挂在 `DayPlan.budget` 上；新建旅行时按天数均分总预算自动补齐。
- 延长行程日期：新增日期自动补齐 DayPlan，每日额度均分当前机动余额（机动余额 = 总预算 − 每日额度合计）。
- 缩短行程日期：若被删日期已有景点，页面指出这些不能删的日期，整体保留不删。
- 调整某天额度：所有天额度合计 + 机动余额不能超过总预算，超出时明确提示超出金额且不保存。
- 安排或挪动景点：当天已用 + 景点价格超过当日额度时本次不写入，页面提示差额，原行程与额度保持不变。
- 相关计算集中在 `utils/budgetCalculator.ts`，展示组件为 `components/common/DayBudgetLine.vue`（列表 / 详情 / 编排 / 分享共用）。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端 | Vue 3 + TypeScript |
| 构建 | Vite |
| UI | Element Plus + ECharts |
| 状态 | Pinia |
| 路由 | Vue Router 4 |
| 持久化 | localStorage + Dexie.js |
| 交互 | sortablejs |

## 目录结构

```
src/
├── api/
├── stores/
├── models/
├── types/
├── components/common/
├── hooks/
├── pages/
├── router/
├── utils/
├── config/
└── constants/
```

## 数据持久化

本地数据通过 `utils/storage.ts` 统一写入 localStorage，并保留 Dexie 数据库对象用于后续 IndexedDB 扩展。版本键来自 `constants/storageVersion.ts`。

## 环境变量

`VITE_AMAP_KEY`：高德地图 key。未配置时使用 demo-key，地图主题配置同时出现在 `config/map.ts`、`SpotCard`、`DayTimeline`、`Planner` 相关逻辑中。

## 枚举出现位置清单

SpotCategory：
- `src/constants/spot.ts`
- `src/models/spot.ts`
- `src/stores/spotStore.ts`
- `src/components/common/CategoryFilter.vue`
- `src/components/common/SpotCard.vue`
- `src/pages/Spots.vue`
- `src/pages/TripDetail.vue`
- `src/utils/formatters.ts`
- `src/router/guards.ts`

TripStatus：
- `src/constants/trip.ts`
- `src/models/trip.ts`
- `src/stores/tripStore.ts`
- `src/components/common/TripCard.vue`
- `src/pages/Trips.vue`
- `src/utils/formatters.ts`
- `src/router/guards.ts`

## License

MIT

