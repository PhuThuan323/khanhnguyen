import { Router } from 'express';
import { prisma } from '../db.js';
import { adminOnly } from '../middleware/auth.js';
import { periodWindow, summarizeFinance } from '../services/reporting.js';
const router = Router();
router.use(adminOnly);

router.get('/finance', async (req, res, next) => {
  try {
    const period = String(req.query.period || 'month');
    const anchor = typeof req.query.anchor === 'string' ? req.query.anchor : undefined;
    let w;
    try { w = periodWindow(period, anchor); } catch (e) { return res.status(400).json({ message: e.message }); }
    const interval = { gte: w.start, lt: w.end };
    const [soldDeals, payments, acquiredCars, maintenance, expenses, warranty, legacySoldCount] = await Promise.all([
      prisma.carDeal.findMany({ where: { soldAt: interval }, include: { buyer: { select: { name: true, phone: true } }, car: { select: { plate: true, brand: true, model: true, purchasePrice: true, maintenance: { select: { amount: true } } } } }, orderBy: { soldAt: 'desc' } }),
      prisma.salePayment.findMany({ where: { receivedAt: interval }, include: { deal: { select: { car: { select: { plate: true } }, buyer: { select: { name: true } } } } }, orderBy: { receivedAt: 'desc' } }),
      prisma.car.findMany({ where: { createdAt: interval }, select: { purchasePrice: true } }),
      prisma.maintenanceRecord.findMany({ where: { createdAt: interval }, select: { amount: true } }),
      prisma.expense.findMany({ where: { date: interval }, select: { category: true, amount: true } }),
      prisma.warrantyRecord.findMany({ where: { date: interval }, select: { amount: true } }),
      prisma.car.count({ where: { status: 'SOLD', deal: { is: null } } }),
    ]);
    const summary = summarizeFinance({ soldDeals, payments, acquiredCars, maintenance, expenses, warranty, legacySoldCount });
    res.json({
      period, range: { startDate: w.startDate, endDateExclusive: w.endDateExclusive, timezone: 'Asia/Ho_Chi_Minh' },
      summary,
      soldCars: soldDeals.map(d => ({ carId: d.carId, plate: d.car.plate, vehicle: `${d.car.brand} ${d.car.model}`, buyer: d.buyer.name, soldAt: d.soldAt, revenue: Number(d.agreedPrice), cost: Number(d.car.purchasePrice || 0) + d.car.maintenance.reduce((sum, m) => sum + Number(m.amount), 0) })),
      paymentHistory: payments.map(p => ({ id: p.id, car: p.deal.car.plate, buyer: p.deal.buyer.name, kind: p.kind, amount: Number(p.amount), receivedAt: p.receivedAt })),
      expenseBreakdown: Object.entries(expenses.reduce((map, e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); return map; }, {})).map(([category, amount]) => ({ category, amount })),
    });
  } catch (e) { next(e); }
});
export default router;
