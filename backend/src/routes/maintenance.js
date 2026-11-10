import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly, canAccessCar } from '../middleware/auth.js';
// YC01 invoice uploads are disabled; historic invoice records remain readable.

import { amountField,nameField,audit,forbiddenNotFound } from '../lib.js';
import {canRecordMaintenance} from '../services/yc03Rules.js';
const router=Router();
const recordInclude={employee:{select:{id:true,name:true,email:true}},invoices:{orderBy:{createdAt:'asc'}}};
router.get('/cars/:carId',async(req,res,next)=>{try{
  if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
  const records=await prisma.maintenanceRecord.findMany({where:{carId:req.params.carId,...(req.user.role==='ADMIN'?{}:{employeeId:req.user.id})},include:recordInclude,orderBy:{createdAt:'desc'}});
  res.json(records.map(r=>req.user.role==='ADMIN'?{...r,amount:Number(r.amount)}:({id:r.id,carId:r.carId,employeeId:r.employeeId,task:r.task,note:r.note,createdAt:r.createdAt,employee:r.employee,invoices:r.invoices})));
}catch(e){next(e)} });
router.post('/cars/:carId',async(req,res,next)=>{try{
  if(req.user.role!=='ADMIN')return res.status(403).json({message:'Chỉ Admin được duyệt và thêm chi phí bảo dưỡng. Xưởng gửi đề xuất để Admin nhập.'});
  if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
  const d=z.object({task:nameField.optional(),amount:amountField,note:z.string().trim().max(3000).optional(),category:z.enum(['Đồng','Sơn','Sửa máy','Điện','Nội thất','Khác','Tặng']).default('Khác'),performedBy:z.string().trim().max(200).optional(),performedAt:z.iso.datetime().optional()}).parse(req.body);
  const car=await prisma.car.findUnique({where:{id:req.params.carId},select:{status:true}});
  if(!canRecordMaintenance(car?.status))return res.status(409).json({message:'Xe chưa hoàn tất kiểm định hoặc hồ sơ đã hủy.'});
  const record=await prisma.$transaction(async tx=>{
    const r=await tx.maintenanceRecord.create({data:{carId:req.params.carId,employeeId:req.user.id,...d,task:d.category},include:recordInclude});
    await audit(tx,req.user.id,'MAINTENANCE_COST_ADDED',req.params.carId,{recordId:r.id,amount:d.amount,task:d.task});
    return r;
  });
  res.status(201).json(req.user.role==='ADMIN'?{...record,amount:Number(record.amount)}:{id:record.id,carId:record.carId,task:record.task,createdAt:record.createdAt});
}catch(e){next(e)} });
router.post('/:recordId/invoices',(_req,res)=>res.status(410).json({message:'YC01: Đã ngừng tải hóa đơn bảo dưỡng.'}));
router.patch('/:recordId',adminOnly,async(req,res,next)=>{try{const d=z.object({task:nameField.optional(),amount:amountField.optional(),note:z.string().trim().max(3000).nullable().optional(),category:z.enum(['Đồng','Sơn','Sửa máy','Điện','Nội thất','Khác','Tặng']).optional(),performedBy:z.string().trim().max(200).nullable().optional(),performedAt:z.iso.datetime().optional()}).strict().parse(req.body);const old=await prisma.maintenanceRecord.findUnique({where:{id:req.params.recordId}});if(!old)return forbiddenNotFound(res);const out=await prisma.maintenanceRecord.update({where:{id:old.id},data:d});await audit(prisma,req.user.id,'MAINTENANCE_EDITED',old.carId,{id:old.id});res.json({...out,amount:Number(out.amount)});}catch(e){next(e)}});
router.delete('/:recordId',adminOnly,async(req,res,next)=>{try{const old=await prisma.maintenanceRecord.findUnique({where:{id:req.params.recordId},include:{invoices:true}});if(!old)return forbiddenNotFound(res);if(old.invoices.length)return res.status(409).json({message:'Hóa đơn cũ đang liên kết, cần xử lý lưu trữ trước khi xóa.'});await prisma.maintenanceRecord.delete({where:{id:old.id}});await audit(prisma,req.user.id,'MAINTENANCE_DELETED',old.carId,{id:old.id,amount:Number(old.amount)});res.json({ok:true});}catch(e){next(e)}});
router.put('/cars/:carId/complete',adminOnly,async(req,res,next)=>{try{
  if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
  const current=await prisma.car.findUnique({where:{id:req.params.carId},select:{status:true}});
  if(!current)return forbiddenNotFound(res);
  if(current.status!=='MAINTENANCE')return res.status(409).json({message:'Xe không còn ở trạng thái bảo dưỡng.'});
  const exists=await prisma.maintenanceRecord.count({where:{carId:req.params.carId}});
  if(!exists)return res.status(409).json({message:'Chưa có chi phí hoặc hạng mục bảo dưỡng.'});
  await prisma.$transaction(async tx=>{
    await tx.car.update({where:{id:req.params.carId},data:{status:'READY_FOR_REVIEW'}});
    await audit(tx,req.user.id,'MAINTENANCE_COMPLETED',req.params.carId);
  });res.json({ok:true});
}catch(e){next(e)} });
router.get('/admin/history/:carId',adminOnly,async(req,res,next)=>{try{
  const records=await prisma.maintenanceRecord.findMany({where:{carId:req.params.carId},include:recordInclude,orderBy:{createdAt:'desc'}});
  res.json(records.map(r=>({...r,amount:Number(r.amount)})));
}catch(e){next(e)} });
export default router;
