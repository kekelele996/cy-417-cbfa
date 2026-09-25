// 最小 localStorage / crypto 桩，便于在 Node 中验证 store 逻辑
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
if (!globalThis.crypto) globalThis.crypto = (await import('node:crypto')).webcrypto;
globalThis.document = { body: {}, createElement: () => ({ style: {}, appendChild() {} }), createElementNS: () => ({ style: {} }) };

const { createPinia, setActivePinia } = await import('pinia');
const { useTripStore } = await import('../src/stores/tripStore.ts');
const { useDayPlanStore } = await import('../src/stores/dayPlanStore.ts');
const { useSpotStore } = await import('../src/stores/spotStore.ts');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓', msg); }
  else { failed++; console.error('  ✗', msg); }
}
function isoAddDays(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

setActivePinia(createPinia());
const tripStore = useTripStore();
const dayStore = useDayPlanStore();
const spotStore = useSpotStore();

// 新建旅行：3 天、总预算 3200，每日额度均摊且合计不超过总预算
const id = tripStore.createTrip('测试行程');
const trip = tripStore.trips.find((t) => t.id === id);
let days = dayStore.tripDays(id);
assert(days.length === 3, `新建后应有 3 天（实际 ${days.length}）`);
const allocated = days.reduce((s, d) => s + d.budget, 0);
assert(allocated === 3200, `每日额度合计应等于总预算 3200（实际 ${allocated}）`);

// 延长到 5 天：自动补齐，机动余额归零，合计仍不超总预算
const end5 = isoAddDays(trip.end_date, 2);
const ext = tripStore.updateTrip(id, { end_date: end5 });
assert(ext.ok && ext.added === 2, `延长 2 天应 ok 且 added=2（实际 ok=${ext.ok}, added=${ext.added}）`);
days = dayStore.tripDays(id);
assert(days.length === 5, `延长后应有 5 天（实际 ${days.length}）`);
assert(days.reduce((s, d) => s + d.budget, 0) === 3200, '延长后各天额度合计仍为 3200');

// 调整某天额度导致超额：不写入并返回超出金额
const before = days[0].budget;
const ok = dayStore.setDayBudget(trip, 1, 4000);
assert(ok === false, '把第 1 天调到 4000 应被拒绝');
assert(days[0].budget === before, `被拒绝后额度应保留为 ${before}（实际 ${days[0].budget}）`);

// 合法调整：第 1 天 +100，机动余额为 -100 之前应成功（合计不能超过 3200）
const ok2 = dayStore.setDayBudget(trip, 1, before);
assert(ok2 === true, '设回原值应成功');

// 安排景点：找一个价格 > 0 的景点，模拟超额拦截
const spot = spotStore.spots.find((s) => s.price > 0);
assert(!!spot, '种子数据中应有价格 > 0 的景点');
// 把所有天额度清零以腾出机动余额
for (const d of dayStore.tripDays(id)) dayStore.setDayBudget(trip, d.day_index, 0);
dayStore.setDayBudget(trip, 1, spot.price - 10); // 第 1 天额度比景点价格少 10
const added = dayStore.addSpot(id, spot.id, spotStore.spots, 1);
assert(added === false, `第 1 天额度差 10 元时加入价格 ${spot.price} 的景点应被拒绝`);
const day1 = dayStore.tripDays(id).find((d) => d.day_index === 1);
assert(day1.items.length === 0, '被拒绝后第 1 天行程不写入');

// 给足额度后可加入
dayStore.setDayBudget(trip, 1, spot.price);
const added2 = dayStore.addSpot(id, spot.id, spotStore.spots, 1);
assert(added2 === true, '额度充足时应能加入');
assert(dayStore.tripDays(id).find((d) => d.day_index === 1).items.length === 1, '加入后第 1 天应有 1 个景点');

// 挪动景点到超额的目标天：不执行
dayStore.setDayBudget(trip, 2, 0);
const moved = dayStore.moveSpot(id, 1, 2, 0, spotStore.spots);
assert(moved === false, '挪到额度为 0 的第 2 天应被拒绝');
assert(dayStore.tripDays(id).find((d) => d.day_index === 1).items.length === 1, '挪动被拒绝后景点仍在第 1 天');
assert(dayStore.tripDays(id).find((d) => d.day_index === 2).items.length === 0, '挪动被拒绝后第 2 天保持为空');

// 缩短：在第 5 天放景点后应被拦截
dayStore.setDayBudget(trip, 5, spot.price);
dayStore.addSpot(id, spot.id, spotStore.spots, 5);
const end3 = isoAddDays(end5, -2);
const shrunk = tripStore.updateTrip(id, { end_date: end3 });
assert(shrunk.ok === false, '尾部第 5 天有景点时缩短应被拒绝');
assert(shrunk.blocked.some((b) => b.day_index === 5 && b.itemCount >= 1), '应指出第 5 天不能删');
assert(tripStore.trips.find((t) => t.id === id).end_date === end5, '被拒绝后旅行结束日期保持不变');
assert(dayStore.tripDays(id).length === 5, '被拒绝后天数保持 5 天');

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
process.exit(failed ? 1 : 0);
