import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly } from '../middleware/auth.js';
import { amountField,nameField,parseDate,audit,forbiddenNotFound } from '../lib.js';
import {validateExpensePayee} from '../services/yc03Rules.js';
const router=Router();
router.get('/expenses',async(req,res,next)=>{try{
 const where=req.user.role==='ADMIN'?{}:{assignedToId:req.user.id};const rows=await prisma.expense.findMany({where,orderBy:{createdAt:'desc'}});res.json(rows.map(e=>({...e,amount:Number(e.amount),date:e.date.toISOString().slice(0,10)})));
}catch(e){next(e)} });
router.post('/expenses',async(req,res,next)=>{try{
 const d=z.object({category:z.enum(['Vận hành','Đồ dùng','Tài lẻ']),amount:amountField,description:z.string().trim().max(2000).optional(),date:z.iso.date(),assignedToId:z.string().nullable().optional(),payeeType:z.enum(['EMPLOYEE','WORKSHOP','SUPPLIER','OTHER']).default('EMPLOYEE'),payeeName:z.string().trim().max(200).nullable().optional()}).parse(req.body);
 if(req.user.role!=='ADMIN'&&(d.payeeType!=='EMPLOYEE'||(d.assignedToId&&d.assignedToId!==req.user.id)))return res.status(403).json({message:'Nhân viên chỉ được ghi chi phí cho chính mình.'});
 const assignedToId=d.payeeType==='EMPLOYEE'?(req.user.role==='ADMIN'?(d.assignedToId||req.user.id):req.user.id):null;
 const invalid=validateExpensePayee(d.payeeType,assignedToId,d.payeeName);
 if(invalid)return res.status(400).json({message:invalid});
 if(assignedToId){const staff=await prisma.user.findUnique({where:{id:assignedToId},select:{id:true,active:true}});if(!staff?.active)return res.status(400).json({message:'Nhân viên được chọn không tồn tại hoặc đã bị khóa.'});}
 const out=await prisma.expense.create({data:{...d,assignedToId,payeeName:d.payeeType==='EMPLOYEE'?null:d.payeeName,date:parseDate(d.date),createdBy:req.user.id}});
 await audit(prisma,req.user.id,'OPERATING_EXPENSE_ADDED',null,{expenseId:out.id,amount:d.amount,category:d.category,payeeType:d.payeeType});
 res.status(201).json({...out,amount:Number(out.amount),date:out.date.toISOString().slice(0,10)});
}catch(e){next(e)} });
router.get('/warranty',adminOnly,async(req,res,next)=>{try{
 const rows=await prisma.warrantyRecord.findMany({orderBy:{createdAt:'desc'}});res.json(rows.map(w=>({...w,amount:Number(w.amount),date:w.date.toISOString().slice(0,10)})));
}catch(e){next(e)} });
router.post('/warranty',adminOnly,async(req,res,next)=>{try{
 const d=z.object({carId:z.string().min(1),description:nameField,amount:amountField,date:z.iso.date()}).parse(req.body);
 const car=await prisma.car.findUnique({where:{id:d.carId}});if(!car)return forbiddenNotFound(res);
 const out=await prisma.warrantyRecord.create({data:{...d,date:parseDate(d.date),createdBy:req.user.id}});
 await audit(prisma,req.user.id,'WARRANTY_COST_ADDED',d.carId,{warrantyId:out.id,amount:d.amount});
 res.status(201).json({...out,amount:Number(out.amount),date:out.date.toISOString().slice(0,10)});
}catch(e){next(e)} });
// Commission can be assigned to any named recipient and changed by Admin with audit trail.
router.post('/cars/:carId/commissions',adminOnly,async(req,res,next)=>{try{
 const d=z.object({recipient:nameField,amount:amountField,note:z.string().max(2000).optional()}).parse(req.body);
 const car=await prisma.car.findUnique({where:{id:req.params.carId}});
 if(!car)return forbiddenNotFound(res);
 if(car.status!=='SOLD')return res.status(409).json({message:'Chỉ ghi hoa hồng cho xe đã bán.'});
 const record=await prisma.saleCommission.create({data:{carId:car.id,...d,createdById:req.user.id}});
 await audit(prisma,req.user.id,'COMMISSION_ADDED',car.id,{id:record.id,amount:d.amount,recipient:d.recipient});
 res.status(201).json({...record,amount:Number(record.amount)});
}catch(e){next(e)}});
router.patch('/commissions/:id',adminOnly,async(req,res,next)=>{try{
 const d=z.object({recipient:nameField.optional(),amount:amountField.optional(),note:z.string().max(2000).nullable().optional()}).strict().parse(req.body);
 const old=await prisma.saleCommission.findUnique({where:{id:req.params.id}});if(!old)return forbiddenNotFound(res);
 const record=await prisma.saleCommission.update({where:{id:old.id},data:d});
 await audit(prisma,req.user.id,'COMMISSION_EDITED',old.carId,{id:old.id,before:{recipient:old.recipient,amount:Number(old.amount)},after:d});
 res.json({...record,amount:Number(record.amount)});
}catch(e){next(e)}});
router.delete('/commissions/:id',adminOnly,async(req,res,next)=>{try{
 const old=await prisma.saleCommission.findUnique({where:{id:req.params.id}});if(!old)return forbiddenNotFound(res);
 await prisma.saleCommission.delete({where:{id:old.id}});
 await audit(prisma,req.user.id,'COMMISSION_DELETED',old.carId,{id:old.id,recipient:old.recipient,amount:Number(old.amount)});
 res.json({ok:true});
}catch(e){next(e)}});
router.get('/cars/:carId/audit',adminOnly,async(req,res,next)=>{try{
 const logs=await prisma.auditLog.findMany({where:{carId:req.params.carId},include:{user:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'desc'},take:500});res.json(logs);
}catch(e){next(e)} });

router.patch('/expenses/:id',adminOnly,async(req,res,next)=>{try{
 const d=z.object({category:z.enum(['Vận hành','Đồ dùng','Tài lẻ']).optional(),amount:amountField.optional(),description:z.string().nullable().optional(),date:z.iso.date().optional(),assignedToId:z.string().nullable().optional(),payeeType:z.enum(['EMPLOYEE','WORKSHOP','SUPPLIER','OTHER']).optional(),payeeName:z.string().trim().max(200).nullable().optional()}).strict().parse(req.body);
 const old=await prisma.expense.findUnique({where:{id:req.params.id}});if(!old)return forbiddenNotFound(res);
 const payeeType=d.payeeType||old.payeeType;
 const assignedToId=payeeType==='EMPLOYEE'?(d.assignedToId||old.assignedToId||req.user.id):null;
 const payeeName=payeeType==='EMPLOYEE'?null:(d.payeeName??old.payeeName);
 const invalid=validateExpensePayee(payeeType,assignedToId,payeeName);if(invalid)return res.status(400).json({message:invalid});
 if(assignedToId){const staff=await prisma.user.findUnique({where:{id:assignedToId},select:{active:true}});if(!staff?.active)return res.status(400).json({message:'Nhân viên được chọn không hợp lệ.'});}
 const x=await prisma.expense.update({where:{id:old.id},data:{...d,payeeType,assignedToId,payeeName,...(d.date?{date:parseDate(d.date)}:{})}});
 await audit(prisma,req.user.id,'OPERATING_EXPENSE_EDITED',null,{expenseId:x.id,oldAmount:Number(old.amount),newAmount:Number(x.amount)});
 res.json({...x,amount:Number(x.amount)});
}catch(e){next(e)}});
router.delete('/expenses/:id',adminOnly,async(req,res,next)=>{try{
 const old=await prisma.expense.findUnique({where:{id:req.params.id}});if(!old)return forbiddenNotFound(res);
 await prisma.expense.delete({where:{id:old.id}});
 await audit(prisma,req.user.id,'OPERATING_EXPENSE_DELETED',null,{expenseId:old.id,amount:Number(old.amount)});
 res.json({ok:true});
}catch(e){next(e)}});
router.patch('/warranty/:id',adminOnly,async(req,res,next)=>{try{const d=z.object({description:nameField.optional(),amount:amountField.optional(),date:z.iso.date().optional()}).strict().parse(req.body);const x=await prisma.warrantyRecord.update({where:{id:req.params.id},data:{...d,...(d.date?{date:parseDate(d.date)}:{})}});await audit(prisma,req.user.id,'WARRANTY_EDITED',x.carId,{id:x.id});res.json({...x,amount:Number(x.amount)})}catch(e){next(e)}});
router.delete('/warranty/:id',adminOnly,async(req,res,next)=>{try{const x=await prisma.warrantyRecord.delete({where:{id:req.params.id}});await audit(prisma,req.user.id,'WARRANTY_DELETED',x.carId,{id:x.id,amount:Number(x.amount)});res.json({ok:true})}catch(e){next(e)}});

export default router;
