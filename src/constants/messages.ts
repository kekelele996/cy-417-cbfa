export const messages = {
  tripCreated: '旅行计划已创建',
  tripDeleted: '旅行计划已删除',
  tripUpdated: '旅行信息已更新',
  spotAdded: '景点已加入当天行程',
  emptyTrips: '还没有旅行计划，先创建一次出发。',
  emptySpots: '没有符合条件的景点。',
  budgetExceeded: '预算可能超支，请调整景点或交通方式',
  storageRecovered: '本地数据已恢复',
  // ---- 每日预算 ----
  dayBudgetFilled: (count: number) => `已自动补齐 ${count} 个新增日期的每日额度（按剩余预算均摊，可再手动调整）`,
  dayBudgetShortenBlocked: (index: number, count: number) =>
    `第 ${index} 天还有 ${count} 个景点，不能删除该日期；请先把景点挪到其他天`,
  allocationSaved: '每日额度已调整',
  allocationExceeded: (over: number) =>
    `所有天额度合计已超过总预算 ${over} 元（机动余额为负），请下调额度后再保存`,
  dayBudgetExceeded: (index: number, over: number) => `第 ${index} 天已用超出当天额度 ${over} 元`,
  assignBlocked: (index: number, short: number) =>
    `第 ${index} 天加入后已用将超过当天额度 ${short} 元，本次未写入，原行程与额度保持不变`,
  dayBudgetEmpty: '当日还没有安排景点',
};
