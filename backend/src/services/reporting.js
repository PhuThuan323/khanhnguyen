const HCM_OFFSET_MS = 7 * 3600_000;
const ONE_DAY = 86_400_000;
const toDay = d => new Date(d.getTime() + HCM_OFFSET_MS).toISOString().slice(0, 10);
const dayIndex = ymd => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const date = new Date(`${ymd}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === ymd ? date : null;
};
export function todayVietnam() { return toDay(new Date()); }
export function periodWindow(period, anchor = todayVietnam()) {
  if (!['week', 'month'].includes(period)) throw new Error('Chỉ hỗ trợ báo cáo tuần hoặc tháng.');
  const day = dayIndex(anchor);
  if (!day) throw new Error('Ngày báo cáo không hợp lệ (YYYY-MM-DD).');
  let start;
  let next;
  if (period === 'week') {
    const weekday = (day.getUTCDay() + 6) % 7; // Monday = 0
    start = new Date(day.getTime() - weekday * ONE_DAY);
    next = new Date(start.getTime() + 7 * ONE_DAY);
  } else {
    start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
    next = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 1));
  }
  return { start: new Date(start.getTime() - HCM_OFFSET_MS), end: new Date(next.getTime() - HCM_OFFSET_MS), startDate: toDay(new Date(start.getTime() - HCM_OFFSET_MS)), endDateExclusive: toDay(new Date(next.getTime() - HCM_OFFSET_MS)) };
}
export const sumMoney = (values) => values.reduce((sum, value) => sum + Number(value || 0), 0);
export function summarizeFinance({ soldDeals, payments, acquiredCars, maintenance, expenses, warranty, legacySoldCount = 0 }) {
  const salesRevenue = sumMoney(soldDeals.map(d => d.agreedPrice));
  const soldVehicleCost = sumMoney(soldDeals.map(d => d.car.purchasePrice));
  const soldMaintenanceCost = sumMoney(soldDeals.flatMap(d => d.car.maintenance.map(m => m.amount)));
  const costOfCarsSold = soldVehicleCost + soldMaintenanceCost;
  const purchaseCashOut = sumMoney(acquiredCars.map(c => c.purchasePrice));
  const maintenanceCashOut = sumMoney(maintenance.map(m => m.amount));
  const operatingExpenses = sumMoney(expenses.map(e => e.amount));
  const warrantyExpenses = sumMoney(warranty.map(w => w.amount));
  const receipts = sumMoney(payments.map(p => p.amount));
  const totalCashOut = purchaseCashOut + maintenanceCashOut + operatingExpenses + warrantyExpenses;
  return {
    salesRevenue, receipts, costOfCarsSold, purchaseCashOut, maintenanceCashOut,
    operatingExpenses, warrantyExpenses, totalCashOut,
    estimatedProfit: salesRevenue - costOfCarsSold - operatingExpenses - warrantyExpenses,
    estimatedCashFlow: receipts - totalCashOut,
    soldCount: soldDeals.length,
    leadCount: null,
    legacySoldCount,
  };
}
