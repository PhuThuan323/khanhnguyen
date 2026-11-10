import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly } from '../middleware/auth.js';
import { amountField, audit, forbiddenNotFound } from '../lib.js';
import { canAcceptDeposit, positiveVnd, remainingBalance, salePaidInFull } from '../services/salesLogic.js';
import {addWarrantyMonths} from '../services/depositRules.js';

const router = Router();
router.use(adminOnly);
const idField = z.string().min(1);
const moneyField = amountField.refine(positiveVnd, 'Số tiền phải là số nguyên VNĐ dương.');
const dateDetails = { payments: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { receivedAt: 'asc' } } };

async function findLead(carId, leadId) {
  return prisma.salesLead.findFirst({ where: { id: leadId, carId } });
}

// Record chronological call / message / meeting history for each interested buyer.
router.post('/cars/:carId/leads/:leadId/activities', async (req, res, next) => {
  try {
    const d = z.object({ kind: z.enum(['CALL', 'MESSAGE', 'VISIT', 'FOLLOW_UP']), content: z.string().trim().min(1).max(3000) }).parse(req.body);
    const lead = await findLead(req.params.carId, req.params.leadId);
    if (!lead) return forbiddenNotFound(res);
    const car = await prisma.car.findUnique({where:{id:lead.carId},select:{status:true}});
    if(!car || car.status==='SOLD') return res.status(409).json({message:'Hồ sơ xe đã bán, không thể thêm lịch sử tư vấn.'});
    const activity = await prisma.leadActivity.create({ data: { carId: lead.carId, leadId: lead.id, createdById: req.user.id, ...d }, include: { createdBy: { select: { id: true, name: true } } } });
    await audit(prisma, req.user.id, 'SALES_CONTACT_LOGGED', lead.carId, { leadId: lead.id, kind: d.kind });
    res.status(201).json(activity);
  } catch (e) { next(e); }
});

// Optional negotiation stage; never creates a deposit and does not assign a buyer.
router.post('/cars/:carId/leads/:leadId/confirm-interest', async (req, res, next) => {
  try {
    const lead = await findLead(req.params.carId, req.params.leadId);
    if (!lead) return forbiddenNotFound(res);
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.car.updateMany({ where: { id: lead.carId, status: { in: ['FOR_SALE', 'CUSTOMER_CLOSED'] } }, data: { status: 'CUSTOMER_CLOSED' } });
      if (!result.count) return null;
      await tx.leadActivity.create({ data: { carId: lead.carId, leadId: lead.id, kind: 'CONFIRMED', content: 'Khách đã xác nhận quan tâm / đang thương lượng', createdById: req.user.id } });
      await audit(tx, req.user.id, 'SALES_INTEREST_CONFIRMED', lead.carId, { leadId: lead.id });
      return true;
    });
    if (!updated) return res.status(409).json({ message: 'Xe đã đặt cọc, đã bán hoặc chưa được duyệt kinh doanh.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// YC03: The old single-buyer deposit endpoint is permanently disabled to prevent
// bypassing the multi-customer deposit ledger. Historic payments remain readable.
router.post('/cars/:carId/deposit', (_req,res)=>res.status(410).json({
  message:'Đường dẫn nhận cọc cũ đã ngừng. Sử dụng quy trình /api/deposits/cars/:carId (mỗi khách một hồ sơ cọc).',
}));

// Lock car row before reading sum/payments to serialize concurrent payment additions.
router.post('/cars/:carId/payments', async (req, res, next) => {
  try {
    const d = z.object({ amount: moneyField, note: z.string().trim().max(1000).optional() }).parse(req.body);
    const output = await prisma.$transaction(async tx => {
      const locked = await tx.car.updateMany({ where: { id: req.params.carId, status: 'DEPOSITED' }, data: { updatedAt: new Date() } });
      if (!locked.count) return { error: 'Chỉ có thể thu thêm tiền khi xe đang ở trạng thái đã nhận cọc.' };
      const deal = await tx.carDeal.findUnique({ where: { carId: req.params.carId }, include: dateDetails });
      if (!deal) return { error: 'Thiếu hồ sơ cọc gắn với người mua. Cần đối soát trước khi thanh toán.' };
      const paid = deal.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      if (d.amount > remainingBalance(deal.agreedPrice, paid)) return { error: 'Số tiền thanh toán vượt quá số dư phải thu.' };
      const payment = await tx.salePayment.create({ data: { dealId: deal.id, kind: 'BALANCE', amount: d.amount, note: d.note,collectorIds:[req.user.id], createdById: req.user.id } });
      await audit(tx, req.user.id, 'CAR_PAYMENT_RECEIVED', req.params.carId, { dealId: deal.id, amount: d.amount, paymentId: payment.id });
      return { paymentId: payment.id };
    });
    if (output.error) return res.status(409).json({ message: output.error });
    res.status(201).json({ ok: true, ...output });
  } catch (e) { next(e); }
});

// Sale is irreversible in this version; retain purchaser and every installment.
router.post('/cars/:carId/sold', async (req, res, next) => {
  try {
    const output = await prisma.$transaction(async tx => {
      const locked = await tx.car.updateMany({ where: { id: req.params.carId, status: 'DEPOSITED' }, data: { updatedAt: new Date() } });
      if (!locked.count) return { error: 'Chỉ được xác nhận bán đối với xe đã đặt cọc và chưa bán.' };
      const deal = await tx.carDeal.findUnique({ where: { carId: req.params.carId }, include: dateDetails });
      if (!deal || deal.soldAt) return { error: 'Không tìm thấy giao dịch hợp lệ hoặc xe đã bán.' };
      const paid = deal.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      if (!salePaidInFull(deal.agreedPrice, paid)) return { error: `Chưa thanh toán đủ. Số tiền còn phải thu: ${remainingBalance(deal.agreedPrice, paid).toLocaleString('vi-VN')}đ.` };
      const now = new Date();
      const months=Number(req.body?.warrantyMonths||0);if(!Number.isInteger(months)||months<0||months>120)return {error:'Thời hạn bảo hành không hợp lệ.'};
      const until=addWarrantyMonths(now,months);
      await tx.car.update({where:{id:req.params.carId},data:{warrantyMonths:months,warrantyUntil:until}});
      await tx.carDeal.update({ where: { id: deal.id }, data: { soldAt: now } });
      await tx.car.update({ where: { id: req.params.carId }, data: { status: 'SOLD' } });
      await audit(tx, req.user.id, 'CAR_SOLD', req.params.carId, { dealId: deal.id, buyerLeadId: deal.buyerLeadId, soldAt: now.toISOString() });
      return { soldAt: now.toISOString() };
    });
    if (output.error) return res.status(409).json({ message: output.error });
    res.json({ ok: true, ...output });
  } catch (e) { next(e); }
});


// YC01: cancel/return/compensate deposit and reopen car. Preserve settlement ledger.
router.post('/cars/:carId/settle-deposit',async(req,res,next)=>{try{
 const d=z.object({reason:z.enum(['CUSTOMER_FORFEIT','RETURN_DEPOSIT','COMPENSATE']),returnedAmount:amountField.default(0),penaltyAmount:amountField.default(0),note:z.string().trim().max(2000).optional()}).parse(req.body);
 const result=await prisma.$transaction(async tx=>{
  const locked=await tx.car.updateMany({where:{id:req.params.carId,status:'DEPOSITED'},data:{updatedAt:new Date()}});if(!locked.count)return null;
  const deal=await tx.carDeal.findUnique({where:{carId:req.params.carId},include:{buyer:true,payments:true}});if(!deal||deal.soldAt)return null;
  const received=deal.payments.filter(p=>p.kind==='DEPOSIT').reduce((s,p)=>s+Number(p.amount),0);
  if(Number(d.returnedAmount)>received)return {error:'Tiền hoàn trả không được lớn hơn tiền cọc đã nhận.'};
  const settled=await tx.depositSettlement.create({data:{carId:req.params.carId,buyerName:deal.buyer.name,buyerPhone:deal.buyer.phone,depositAmount:received,returnedAmount:d.returnedAmount,penaltyAmount:d.penaltyAmount,reason:d.reason,note:d.note}});
  await tx.salePayment.deleteMany({where:{dealId:deal.id}});await tx.carDeal.delete({where:{id:deal.id}});await tx.car.update({where:{id:req.params.carId},data:{status:'FOR_SALE',deposit:null}});
  await audit(tx,req.user.id,'DEPOSIT_SETTLED',req.params.carId,{settlementId:settled.id,reason:d.reason,received,returnedAmount:d.returnedAmount,penaltyAmount:d.penaltyAmount});return {ok:true,settlementId:settled.id};
 });if(!result)return res.status(409).json({message:'Xe không có giao dịch cọc đang hiệu lực.'});if(result.error)return res.status(400).json({message:result.error});res.json(result);
}catch(e){next(e)}});

export default router;
