import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly, canAccessCar } from '../middleware/auth.js';
import { uploadBuffer,deleteCloudAsset } from '../services/cloudinary.js';
import { uploadSingle,requireUpload } from '../middleware/upload.js';
import { amountField,nameField,audit,forbiddenNotFound } from '../lib.js';
const router=Router();
const recordInclude={employee:{select:{id:true,name:true,email:true}},invoices:{orderBy:{createdAt:'asc'}}};
router.get('/cars/:carId',async(req,res,next)=>{try{
  if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
  const records=await prisma.maintenanceRecord.findMany({where:{carId:req.params.carId,...(req.user.role==='ADMIN'?{}:{employeeId:req.user.id})},include:recordInclude,orderBy:{createdAt:'desc'}});
  res.json(records.map(r=>req.user.role==='ADMIN'?{...r,amount:Number(r.amount)}:({id:r.id,carId:r.carId,employeeId:r.employeeId,task:r.task,note:r.note,createdAt:r.createdAt,employee:r.employee,invoices:r.invoices})));
}catch(e){next(e)} });
router.post('/cars/:carId',async(req,res,next)=>{try{
  if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
  const d=z.object({task:nameField,amount:amountField,note:z.string().trim().max(3000).optional()}).parse(req.body);
  const car=await prisma.car.findUnique({where:{id:req.params.carId},select:{status:true}});
  if(car.status!=='MAINTENANCE')return res.status(409).json({message:'Chỉ thêm chi phí khi xe đang bảo dưỡng.'});
  const record=await prisma.$transaction(async tx=>{
    const r=await tx.maintenanceRecord.create({data:{carId:req.params.carId,employeeId:req.user.id,...d},include:recordInclude});
    await audit(tx,req.user.id,'MAINTENANCE_COST_ADDED',req.params.carId,{recordId:r.id,amount:d.amount,task:d.task});
    return r;
  });
  res.status(201).json(req.user.role==='ADMIN'?{...record,amount:Number(record.amount)}:{id:record.id,carId:record.carId,task:record.task,createdAt:record.createdAt});
}catch(e){next(e)} });
router.post('/:recordId/invoices',uploadSingle,requireUpload,async(req,res,next)=>{try{
  const record=await prisma.maintenanceRecord.findUnique({where:{id:req.params.recordId},include:{car:{select:{status:true}}}});
  if(!record||!await canAccessCar(req.user,record.carId))return forbiddenNotFound(res);
  if(req.user.role!=='ADMIN'&&record.employeeId!==req.user.id)return res.status(403).json({message:'Chỉ được tải hóa đơn cho chi phí do mình tạo.'});
  if(record.car.status!=='MAINTENANCE')return res.status(409).json({message:'Xe đã chốt bảo dưỡng; không được thay đổi hóa đơn.'});
  const isPdf=req.file.detectedFormat==='pdf';
  const resource_type=isPdf?'raw':'image';
  const cloud=await uploadBuffer(req.file.buffer,{folder:`garage-os/cars/${record.carId}/invoices`,resource_type});
  try {
    const invoice=await prisma.$transaction(async tx=>{
      const i=await tx.maintenanceInvoice.create({data:{maintenanceRecordId:record.id,publicId:cloud.public_id,format:cloud.format||req.file.detectedFormat,resourceType:resource_type,originalName:req.file.originalname.slice(0,255),uploadedById:req.user.id}});
      await audit(tx,req.user.id,'MAINTENANCE_INVOICE_UPLOADED',record.carId,{recordId:record.id,invoiceId:i.id});
      return i;
    });
    res.status(201).json(invoice);
  } catch(e) {await deleteCloudAsset(cloud.public_id,resource_type).catch(()=>{});throw e}
}catch(e){next(e)} });
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
