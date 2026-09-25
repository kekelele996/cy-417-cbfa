# TripWeaver 旅游行程规划助手

## 快速启动

```bash
pnpm install
pnpm dev
```

访问地址：http://localhost:18417

TripWeaver 是一款纯前端旅行规划应用，支持创建旅行、探索景点、编排每日行程、预算统计和分享预览。

## 主要功能

- 我的旅行：创建、筛选、删除旅行计划，列表展示每天额度、已用与剩余。
- 行程详情：查看每日行程、预算图表、共享时间线，编辑总预算与日期、调整每日额度。
- 景点探索：按 SpotCategory 搜索和筛选，收藏并加入行程指定的某一天。
- 行程编排：SortableJS 拖拽排序，实时影响预算计算，支持把景点挪动到别天。
- 分享预览：生成可复制的行程文本，含每天额度、已用与剩余。

### 每日预算规则

- 新建旅行时按总预算均摊生成每天额度；延长日期自动补齐新天额度（从机动余额均摊，不改旧天）。
- 缩短日期时，若待删的某天仍有景点，会指出不能删除的日期，本次日期改动与每日额度均不写入。
- 调整某天额度时，所有天额度合计不能超过总预算（机动余额 = 总预算 − 各天额度，不可为负）；超出多少会明确提示且不保存。
- 安排或挪动景点到某天后，若当天已用金额会超过当天额度，本次不写入，页面提示差额，原行程与额度保持不变。
- 旅行列表、行程详情、分享单均展示每天的额度、已用与剩余。

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

