import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAcceptDeposit, positiveVnd, remainingBalance, salePaidInFull } from '../src/services/salesLogic.js';
import { periodWindow, summarizeFinance } from '../src/services/reporting.js';

test('Cọc chỉ được từ trạng thái xe đang bán/chốt tư vấn', () => {
  assert.equal(canAcceptDeposit('FOR_SALE'), true);
  assert.equal(canAcceptDeposit('CUSTOMER_CLOSED'), true);
  for (const s of ['INSPECTION', 'MAINTENANCE', 'DEPOSITED', 'SOLD', 'CANCELLED']) assert.equal(canAcceptDeposit(s), false);
});
test('Chặn số tiền âm/lẻ và không bán khi chưa đủ tiền', () => {
  for (const n of [-1, 0, 1.5, NaN, 1e15]) assert.equal(positiveVnd(n), false);
  assert.equal(positiveVnd(5_000_000), true);
  assert.equal(remainingBalance(400_000_000, 20_000_000), 380_000_000);
  assert.equal(salePaidInFull(400_000_000, 399_999_999), false);
  assert.equal(salePaidInFull(400_000_000, 400_000_000), true);
});
test('Báo cáo tuần bắt đầu thứ Hai, theo múi giờ Việt Nam', () => {
  const w = periodWindow('week', '2026-11-03');
  assert.equal(w.startDate, '2026-11-02');
  assert.equal(w.endDateExclusive, '2026-11-09');
  assert.equal(w.start.toISOString(), '2026-11-01T17:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-11-08T17:00:00.000Z');
});
test('Báo cáo tháng kết thúc tại đầu tháng kế tiếp, kể cả năm nhuận', () => {
  const w = periodWindow('month','2028-02-29');
  assert.equal(w.startDate, '2028-02-01');
  assert.equal(w.endDateExclusive, '2028-03-01');
  assert.throws(() => periodWindow('month', '2026-02-29'));
});
test('Tiền cọc tính là tiền thực thu, không cộng lần hai vào doanh thu', () => {
  const r = summarizeFinance({
    soldDeals: [{ agreedPrice: 500_000_000, car: { purchasePrice: 350_000_000, maintenance: [{ amount: 5_000_000 }] } }],
    payments: [{ amount: 50_000_000 },{ amount: 450_000_000 }],
    acquiredCars: [{purchasePrice: 100_000_000}],
    maintenance: [{amount: 5_000_000}],
    expenses: [{amount: 4_000_000}],
    warranty: [{amount: 1_000_000}],
  });
  assert.equal(r.salesRevenue, 500_000_000);
  assert.equal(r.receipts, 500_000_000);
  assert.equal(r.costOfCarsSold, 355_000_000);
  assert.equal(r.estimatedProfit, 140_000_000);
  assert.equal(r.totalCashOut, 110_000_000);
  assert.equal(r.estimatedCashFlow, 390_000_000);
});
