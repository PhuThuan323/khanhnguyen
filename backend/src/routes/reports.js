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
    const [soldDeals, payments, acquiredCars, maintenance, expenses, warranty, legacySoldCount, newPayments, refunds, commissions, documents] = await Promise.all([
      prisma.carDeal.findMany({ where: { soldAt: interval }, include: { buyer: { select: { name: true, phone: true } }, car: { select: { plate: true, brand: true, model: true, purchasePrice: true, vehicleDocument:{select:{cost:true,createdAt:true}}, maintenance: { select: { amount: true,performedAt:true } } } } }, orderBy: { soldAt: 'desc' } }),
      prisma.salePayment.findMany({ where: { receivedAt: interval }, include: { deal: { select: { car: { select: { id:true,plate: true } }, buyer: { select: { name: true } } } } }, orderBy: { receivedAt: 'desc' } }),
      prisma.car.findMany({ where: { createdAt: interval }, select: { purchasePrice: true } }),
      prisma.maintenanceRecord.findMany({ where: { performedAt: interval }, select: { amount: true,performedAt:true,car:{select:{deal:{select:{soldAt:true}}}} } }),
      prisma.expense.findMany({ where: { date: interval }, select: { category: true, amount: true,description:true } }),
      prisma.warrantyRecord.findMany({ where: { date: interval }, select: { amount: true } }),
      prisma.car.count({ where: { status: 'SOLD', deal: { is: null } } }),
      prisma.carDepositPayment.findMany({where:{createdAt:interval},include:{deposit:{include:{car:{select:{plate:true}},lead:{select:{name:true}}}}}}),
      prisma.carDepositRefund.findMany({where:{createdAt:interval},include:{deposit:{include:{payments:{select:{amount:true}},car:{select:{plate:true}},lead:{select:{name:true}}}}}}),
      prisma.saleCommission.findMany({where:{createdAt:interval}}),
      prisma.vehicleDocument.findMany({where:{createdAt:interval},select:{cost:true,createdAt:true,car:{select:{deal:{select:{soldAt:true}}}}}}),
    ]);
    const employeeExpenses=await prisma.expense.findMany({where:{date:interval},select:{assignedToId:true,payeeType:true,payeeName:true,category:true,amount:true}});
    // New multi-buyer deposits are authoritative for cash accounting. Copied SalePayment rows serve sold-deal history only.
    const modernCarIds=await prisma.carDeposit.findMany({select:{carId:true}});
    const modernIds=new Set(modernCarIds.map(x=>x.carId));
    const oldPayments=payments.filter(p=>!modernIds.has(p.deal.car.id));
    const allReceipts=[...oldPayments,...newPayments];
    const refundCash=refunds.reduce((sum,r)=>sum+Number(r.returnedAmount)+Number(r.penaltyAmount),0);
    const users=await prisma.user.findMany({where:{id:{in:[...new Set(employeeExpenses.map(x=>x.assignedToId).filter(Boolean))]}},select:{id:true,name:true}});
    const byId=new Map(users.map(x=>[x.id,x.name]));
    const summary = summarizeFinance({ soldDeals, payments:allReceipts, acquiredCars, maintenance, expenses, warranty, documents, legacySoldCount });
    summary.depositRefundCash=refundCash;
    summary.depositForfeitureIncome=refunds.filter(r=>r.reason==='CUSTOMER_FORFEIT').reduce((n,r)=>n+r.deposit.payments.reduce((m,p)=>m+Number(p.amount),0),0);
    summary.estimatedProfit+=summary.depositForfeitureIncome;
    summary.salesCommissions=commissions.reduce((n,c)=>n+Number(c.amount),0);
    summary.estimatedProfit-=summary.salesCommissions;
    summary.estimatedCashFlow-=summary.salesCommissions;
    summary.totalCashOut+=refundCash+summary.salesCommissions;
    summary.estimatedCashFlow-=refundCash;
    summary.estimatedProfit-=refunds.reduce((sum,r)=>sum+Number(r.penaltyAmount),0);
    res.json({
      period, range: { startDate: w.startDate, endDateExclusive: w.endDateExclusive, timezone: 'Asia/Ho_Chi_Minh' },
      summary,
      byEmployee:Object.entries(employeeExpenses.reduce((m,e)=>{const k=e.payeeType==='EMPLOYEE'?(e.assignedToId||'Chưa phân công'):`${e.payeeType}: ${e.payeeName||'Chưa nhập tên'}`;m[k]=(m[k]||0)+Number(e.amount);return m},{})).map(([employeeId,total])=>({employeeId,name:byId.get(employeeId)||employeeId,total})),
      byExpenseCategory:Object.entries(employeeExpenses.reduce((m,e)=>{m[e.category]=(m[e.category]||0)+Number(e.amount);return m},{})).map(([category,total])=>({category,total})),
      byExpenseItem:Object.entries(expenses.reduce((m,e)=>{const k=e.description||'Không ghi diễn giải';m[k]=(m[k]||0)+Number(e.amount);return m},{})).map(([description,total])=>({description,total})).sort((a,b)=>b.total-a.total),
      soldCars: soldDeals.map(d => ({ carId: d.carId, plate: d.car.plate, vehicle: `${d.car.brand} ${d.car.model}`, buyer: d.buyer.name, soldAt: d.soldAt, revenue: Number(d.agreedPrice), cost: Number(d.car.purchasePrice || 0) + d.car.maintenance.filter(m=>!d.soldAt||!m.performedAt||new Date(m.performedAt)<=new Date(d.soldAt)).reduce((sum, m) => sum + Number(m.amount), 0) + (!d.car.vehicleDocument?.createdAt||new Date(d.car.vehicleDocument.createdAt)<=new Date(d.soldAt)?Number(d.car.vehicleDocument?.cost||0):0) })),
      paymentHistory: [...oldPayments.map(p=>({id:p.id,car:p.deal.car.plate,buyer:p.deal.buyer.name,kind:p.kind,amount:Number(p.amount),receivedAt:p.receivedAt})),...newPayments.map(p=>({id:p.id,car:p.deposit.car.plate,buyer:p.deposit.lead.name,kind:p.kind,amount:Number(p.amount),receivedAt:p.createdAt}))].sort((a,b)=>new Date(b.receivedAt)-new Date(a.receivedAt)),
      expenseBreakdown: Object.entries(expenses.reduce((map, e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); return map; }, {})).map(([category, amount]) => ({ category, amount })),
    });
  } catch (e) { next(e); }
});

router.get('/cars/:carId',async(req,res,next)=>{try{const car=await prisma.car.findUnique({where:{id:req.params.carId},include:{maintenance:true,warranty:true,vehicleDocument:true,deal:{include:{buyer:true,payments:true}},depositSettlements:true,commissions:true,competingDeposits:{include:{payments:true,settlements:true}}}});if(!car)return res.status(404).json({message:'Không tìm thấy xe.'});const documentCost=Number(car.vehicleDocument?.cost||0),purchase=Number(car.purchasePrice||0),maintenance=car.maintenance.reduce((s,x)=>s+Number(x.amount),0),warranty=car.warranty.reduce((s,x)=>s+Number(x.amount),0),refunds=car.depositSettlements.reduce((s,x)=>s+Number(x.returnedAmount)+Number(x.penaltyAmount),0),forfeited=car.depositSettlements.reduce((s,x)=>s+Number(x.depositAmount)-Number(x.returnedAmount),0),revenue=car.deal?.soldAt?Number(car.deal.agreedPrice):0,modernRefunds=car.competingDeposits.flatMap(x=>x.settlements).reduce((n,r)=>n+Number(r.returnedAmount)+Number(r.penaltyAmount),0),commission=car.commissions.reduce((n,c)=>n+Number(c.amount),0),modernForfeit=car.competingDeposits.filter(x=>x.status==='FORFEITED').reduce((n,x)=>n+x.payments.reduce((m,p)=>m+Number(p.amount),0),0);res.json({carId:car.id,plate:car.plate,carName:`${car.brand} ${car.model}`,purchase,maintenance,warranty,documentCost,commission,refunds:refunds+modernRefunds,forfeited:forfeited+modernForfeit,revenue,cost:purchase+maintenance+warranty+commission+documentCost+car.depositSettlements.reduce((n,x)=>n+Number(x.penaltyAmount),0)+car.competingDeposits.flatMap(x=>x.settlements).reduce((n,r)=>n+Number(r.penaltyAmount),0),profit:revenue+forfeited+modernForfeit-purchase-maintenance-warranty-commission-documentCost-car.depositSettlements.reduce((n,x)=>n+Number(x.penaltyAmount),0)-car.competingDeposits.flatMap(x=>x.settlements).reduce((n,r)=>n+Number(r.penaltyAmount),0),expectedPrice:Math.max(0,Number(car.salePrice||0)-Number(car.discount||0)),expectedProfit:Math.max(0,Number(car.salePrice||0)-Number(car.discount||0))-purchase-maintenance-warranty-documentCost});}catch(e){next(e)}});

export default router;
