import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly,canAccessCar } from '../middleware/auth.js';
import { audit, amountField, forbiddenNotFound } from '../lib.js';
const router=Router();
const schema=z.object({
 status:z.enum(['WITHDRAWING','COMPLETED']),
 customerName:z.string().trim().min(1).max(200),
 customerPhone:z.string().trim().min(1).max(30),
 destinationProvince:z.string().trim().min(1).max(100),
 cost:amountField,
 note:z.string().trim().max(3000).optional().nullable(),
}).strict();
router.get('/cars/:carId',async(req,res,next)=>{try{
 if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
 const record=await prisma.vehicleDocument.findUnique({where:{carId:req.params.carId}});
 if(req.user.role!=='ADMIN'&&record)return res.json({...record,cost:undefined});
 res.json(record?{...record,cost:Number(record.cost)}:null);
}catch(e){next(e)}});
router.put('/cars/:carId',adminOnly,async(req,res,next)=>{try{
 const d=schema.parse(req.body);
 const car=await prisma.car.findUnique({where:{id:req.params.carId},select:{id:true}});
 if(!car)return forbiddenNotFound(res);
 const out=await prisma.$transaction(async tx=>{
  const old=await tx.vehicleDocument.findUnique({where:{carId:car.id},select:{completedAt:true,status:true}});
  const data={...d,completedAt:d.status==='COMPLETED'?(old?.completedAt||new Date()):null};
  const record=await tx.vehicleDocument.upsert({where:{carId:car.id},create:{...data,carId:car.id,createdById:req.user.id},update:data});
  await audit(tx,req.user.id,old?'DOCUMENT_UPDATED':'DOCUMENT_CREATED',car.id,{status:d.status,cost:d.cost,destinationProvince:d.destinationProvince});
  return record;
 });
 res.json({...out,cost:Number(out.cost)});
}catch(e){next(e)}});
router.delete('/cars/:carId',adminOnly,async(req,res,next)=>{try{
 const record=await prisma.vehicleDocument.findUnique({where:{carId:req.params.carId}});
 if(!record)return forbiddenNotFound(res);
 await prisma.$transaction(async tx=>{
  await tx.vehicleDocument.delete({where:{id:record.id}});
  await audit(tx,req.user.id,'DOCUMENT_DELETED',record.carId,{cost:Number(record.cost)});
 });
 res.json({ok:true});
}catch(e){next(e)}});
export default router;
