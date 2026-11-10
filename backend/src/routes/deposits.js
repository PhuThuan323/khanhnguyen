import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly } from '../middleware/auth.js';
import { audit, amountField } from '../lib.js';
import {paidTotal,validateSettlement,settleStatus,addWarrantyMonths} from '../services/depositRules.js';

const router=Router();
router.use(adminOnly);
const positive=amountField.refine(v=>Number.isSafeInteger(v)&&v>0,'Số tiền phải là số nguyên VNĐ lớn hơn 0');
const nonnegative=amountField.refine(v=>Number.isSafeInteger(v)&&v>=0,'Số tiền phải là số nguyên VNĐ không âm');
const selections=z.array(z.string().min(1)).max(20).default([]);
const created={payments:{orderBy:{createdAt:'asc'}},settlements:{orderBy:{createdAt:'asc'}},lead:{select:{id:true,name:true,phone:true}}};
const numbers=o=>({...o,agreedPrice:Number(o.agreedPrice),payments:o.payments.map(p=>({...p,amount:Number(p.amount)})),settlements:o.settlements.map(x=>({...x,returnedAmount:Number(x.returnedAmount),penaltyAmount:Number(x.penaltyAmount)}))});
const paid=o=>paidTotal(o.payments);
const legacy=async(tx,carId)=>tx.carDeal.findUnique({where:{carId}});

router.get('/cars/:carId',async(req,res,next)=>{try{
 const results=await prisma.carDeposit.findMany({where:{carId:req.params.carId},include:created,orderBy:{createdAt:'asc'}});
 res.json(results.map(numbers));
}catch(e){next(e)}});

router.post('/cars/:carId',async(req,res,next)=>{try{
 const d=z.object({leadId:z.string().min(1),amount:positive,note:z.string().max(1000).optional(),warrantyMonths:z.number().int().min(0).max(120).default(3)}).parse(req.body);
 const result=await prisma.$transaction(async tx=>{
  const lock=await tx.car.updateMany({where:{id:req.params.carId,status:{in:['FOR_SALE','CUSTOMER_CLOSED','DEPOSITED']}},data:{updatedAt:new Date()}});
  if(!lock.count)return {error:'Xe chưa mở bán hoặc đã bán.'};
  if(await legacy(tx,req.params.carId))return {error:'Xe đã có hồ sơ cọc phiên bản cũ. Cần đối soát/chuyển dữ liệu trước khi dùng quy trình nhiều khách.'};
  const lead=await tx.salesLead.findFirst({where:{id:d.leadId,carId:req.params.carId}});
  if(!lead)return {error:'Khách không thuộc hồ sơ xe.'};
  const car=await tx.car.findUnique({where:{id:req.params.carId}});
  const price=Math.round(Number(car.salePrice||0)-Number(car.discount||0));
  if(price<=0||d.amount>price)return {error:'Tiền cọc không được vượt giá bán sau giảm.'};
  const offer=await tx.carDeposit.create({data:{carId:req.params.carId,leadId:lead.id,agreedPrice:price,collectorIds:[req.user.id],note:d.note,createdById:req.user.id}});
  await tx.carDepositPayment.create({data:{depositId:offer.id,kind:'DEPOSIT',amount:d.amount,collectorIds:[req.user.id],note:d.note,createdById:req.user.id}});
  if(d.amount===price){
   // Full payment in the first transaction wins immediately, without needing an extra manual confirmation.
   const now=new Date(),until=addWarrantyMonths(now,d.warrantyMonths);
   const deal=await tx.carDeal.create({data:{carId:req.params.carId,buyerLeadId:lead.id,agreedPrice:price,createdById:req.user.id,depositedAt:now,soldAt:now}});
   await tx.salePayment.create({data:{dealId:deal.id,kind:'DEPOSIT',amount:d.amount,createdById:req.user.id,collectorIds:[req.user.id],note:d.note,receivedAt:now}});
   await tx.carDeposit.update({where:{id:offer.id},data:{status:'WON'}});
   await tx.carDeposit.updateMany({where:{carId:req.params.carId,status:'ACTIVE',id:{not:offer.id}},data:{status:'REFUND_DUE'}});
   await tx.car.update({where:{id:req.params.carId},data:{status:'SOLD',warrantyMonths:d.warrantyMonths,warrantyUntil:until}});
   await audit(tx,req.user.id,'CAR_SOLD_PAID_IN_FULL',req.params.carId,{winnerOfferId:offer.id,leadId:lead.id,price});
  }else await tx.car.update({where:{id:req.params.carId},data:{status:'DEPOSITED'}});
  await audit(tx,req.user.id,'DEPOSIT_RECEIVED',req.params.carId,{offerId:offer.id,leadId:lead.id,amount:d.amount});
  return {ok:true,offerId:offer.id,sold:d.amount===price};
 });
 if(result.error)return res.status(409).json({message:result.error});res.status(201).json(result);
}catch(e){if(e.code==='P2002')return res.status(409).json({message:'Khách này đã có một hồ sơ cọc cho xe.'});next(e)}});

router.post('/:offerId/payments',async(req,res,next)=>{try{
 const d=z.object({amount:positive,note:z.string().max(1000).optional(),warrantyMonths:z.number().int().min(0).max(120).default(3)}).parse(req.body);
 const result=await prisma.$transaction(async tx=>{
  const initial=await tx.carDeposit.findUnique({where:{id:req.params.offerId}});
  if(!initial)return {error:'Không tìm thấy cọc.'};
  const locked=await tx.car.updateMany({where:{id:initial.carId,status:'DEPOSITED'},data:{updatedAt:new Date()}});
  if(!locked.count)return {error:'Xe đã bán hoặc không ở trạng thái đang nhận cọc.'};
  const offer=await tx.carDeposit.findUnique({where:{id:initial.id},include:{payments:true}});
  if(offer.status!=='ACTIVE')return {error:'Hồ sơ cọc đã được xử lý.'};
  const total=paid(offer),price=Number(offer.agreedPrice);
  if(total+d.amount>price)return {error:'Số tiền nhận vượt giá giao dịch đã thỏa thuận.'};
  const payment=await tx.carDepositPayment.create({data:{depositId:offer.id,kind:'BALANCE',amount:d.amount,note:d.note,collectorIds:[req.user.id],createdById:req.user.id}});
  let sold=false;
  if(total+d.amount===price){
   const now=new Date();const until=addWarrantyMonths(now,d.warrantyMonths);
   const deal=await tx.carDeal.create({data:{carId:offer.carId,buyerLeadId:offer.leadId,agreedPrice:offer.agreedPrice,createdById:req.user.id,depositedAt:offer.createdAt,soldAt:now}});
   const all=[...offer.payments,{amount:d.amount,kind:'BALANCE',note:d.note,collectorIds:[req.user.id],createdAt:now}];
   for(const p of all)await tx.salePayment.create({data:{dealId:deal.id,kind:p.kind,amount:p.amount,note:p.note||null,collectorIds:p.collectorIds||[],createdById:req.user.id,receivedAt:p.createdAt}});
   await tx.carDeposit.update({where:{id:offer.id},data:{status:'WON'}});
   await tx.carDeposit.updateMany({where:{carId:offer.carId,status:'ACTIVE',id:{not:offer.id}},data:{status:'REFUND_DUE'}});
   await tx.car.update({where:{id:offer.carId},data:{status:'SOLD',warrantyMonths:d.warrantyMonths,warrantyUntil:until}});
   await audit(tx,req.user.id,'CAR_SOLD_PAID_IN_FULL',offer.carId,{winnerOfferId:offer.id,leadId:offer.leadId,price,warrantyMonths:d.warrantyMonths});sold=true;
  }else await audit(tx,req.user.id,'DEPOSIT_PART_PAYMENT',offer.carId,{offerId:offer.id,amount:d.amount});
  return {ok:true,paymentId:payment.id,sold,remaining:price-total-d.amount};
 });
 if(result.error)return res.status(409).json({message:result.error});res.status(201).json(result);
}catch(e){next(e)}});

router.post('/:offerId/settle',async(req,res,next)=>{try{
 const d=z.object({reason:z.enum(['CUSTOMER_FORFEIT','RETURN_DEPOSIT','COMPENSATE']),returnedAmount:nonnegative,penaltyAmount:nonnegative.default(0),note:z.string().max(2000).optional()}).parse(req.body);
 const result=await prisma.$transaction(async tx=>{
  const initial=await tx.carDeposit.findUnique({where:{id:req.params.offerId}});
  if(!initial)return {error:'Không tìm thấy hồ sơ cọc.'};
  await tx.car.updateMany({where:{id:initial.carId},data:{updatedAt:new Date()}});
  const offer=await tx.carDeposit.findUnique({where:{id:initial.id},include:{payments:true}});
  if(!['ACTIVE','REFUND_DUE'].includes(offer.status))return {error:'Hồ sơ cọc không còn chờ xử lý.'};
  const total=paid(offer);
  if(offer.status==='REFUND_DUE'&&d.reason==='CUSTOMER_FORFEIT')return {error:'Xe đã bán cho người khác, không thể giữ cọc của khách đang chờ hoàn/đền.'};
  const problem=validateSettlement(d.reason,total,d.returnedAmount,d.penaltyAmount);
  if(problem)return {error:problem};
  const settled=await tx.carDepositRefund.create({data:{depositId:offer.id,reason:d.reason,returnedAmount:d.returnedAmount,penaltyAmount:d.penaltyAmount,note:d.note,createdById:req.user.id}});
  const status=settleStatus(d.reason);
  await tx.carDeposit.update({where:{id:offer.id},data:{status}});
  const other=await tx.carDeposit.count({where:{carId:offer.carId,status:'ACTIVE'}});
  const car=await tx.car.findUnique({where:{id:offer.carId}});
  if(car.status==='DEPOSITED'&&other===0)await tx.car.update({where:{id:car.id},data:{status:'FOR_SALE',deposit:null}});
  await audit(tx,req.user.id,'DEPOSIT_SETTLED',offer.carId,{offerId:offer.id,reason:d.reason,received:total,returnedAmount:d.returnedAmount,penaltyAmount:d.penaltyAmount});
  return {ok:true,settlementId:settled.id,status};
 });
 if(result.error)return res.status(409).json({message:result.error});res.json(result);
}catch(e){next(e)}});
export default router;
