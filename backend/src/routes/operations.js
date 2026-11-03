import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly } from '../middleware/auth.js';
import { amountField,nameField,parseDate,audit,forbiddenNotFound } from '../lib.js';
const router=Router();router.use(adminOnly);
router.get('/expenses',async(req,res,next)=>{try{
 const rows=await prisma.expense.findMany({orderBy:{createdAt:'desc'}});res.json(rows.map(e=>({...e,amount:Number(e.amount),date:e.date.toISOString().slice(0,10)})));
}catch(e){next(e)} });
router.post('/expenses',async(req,res,next)=>{try{
 const d=z.object({category:nameField,amount:amountField,description:z.string().trim().max(2000).optional(),date:z.iso.date()}).parse(req.body);
 const out=await prisma.expense.create({data:{...d,date:parseDate(d.date),createdBy:req.user.id}});
 res.status(201).json({...out,amount:Number(out.amount),date:out.date.toISOString().slice(0,10)});
}catch(e){next(e)} });
router.get('/warranty',async(req,res,next)=>{try{
 const rows=await prisma.warrantyRecord.findMany({orderBy:{createdAt:'desc'}});res.json(rows.map(w=>({...w,amount:Number(w.amount),date:w.date.toISOString().slice(0,10)})));
}catch(e){next(e)} });
router.post('/warranty',async(req,res,next)=>{try{
 const d=z.object({carId:z.string().min(1),description:nameField,amount:amountField,date:z.iso.date()}).parse(req.body);
 const car=await prisma.car.findUnique({where:{id:d.carId}});if(!car)return forbiddenNotFound(res);
 const out=await prisma.warrantyRecord.create({data:{...d,date:parseDate(d.date),createdBy:req.user.id}});
 await audit(prisma,req.user.id,'WARRANTY_COST_ADDED',d.carId,{warrantyId:out.id,amount:d.amount});
 res.status(201).json({...out,amount:Number(out.amount),date:out.date.toISOString().slice(0,10)});
}catch(e){next(e)} });
router.get('/cars/:carId/audit',async(req,res,next)=>{try{
 const logs=await prisma.auditLog.findMany({where:{carId:req.params.carId},include:{user:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'desc'},take:500});res.json(logs);
}catch(e){next(e)} });
export default router;
