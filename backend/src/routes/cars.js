import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly, canAccessCar } from '../middleware/auth.js';
import { audit, forbiddenNotFound, amountField, nameField } from '../lib.js';
import {serializeCar,numberOrNull} from '../services/serializeCar.js';
const router=Router();
const include = {
  assignments:{include:{employee:{select:{id:true,name:true,email:true,active:true}}}},
  blocks:{include:{photos:{include:{uploadedBy:{select:{id:true,name:true}}},orderBy:{createdAt:'asc'}},comments:{include:{author:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'asc'}},
  maintenance:{include:{employee:{select:{id:true,name:true,email:true}},invoices:{orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'desc'}},
  leads:{include:{activities:{include:{createdBy:{select:{id:true,name:true}}},orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'asc'}},
  deal:{include:{buyer:{select:{id:true,name:true,phone:true,tiktok:true,address:true}},payments:{include:{createdBy:{select:{id:true,name:true}}},orderBy:{receivedAt:'asc'}}}},
  warranty:{orderBy:{date:'desc'}}
};
router.get('/', async(req,res,next)=>{ try {
  const where=req.user.role==='ADMIN'?{}:{assignments:{some:{employeeId:req.user.id}}};
  const cars=await prisma.car.findMany({where,include,orderBy:{createdAt:'desc'}});
  res.json(cars.map(c=>serializeCar(c,req.user.role,req.user.id)));
} catch(e){next(e)} });
router.get('/:id',async(req,res,next)=>{try {
  if(!await canAccessCar(req.user,req.params.id))return forbiddenNotFound(res);
  const car=await prisma.car.findUnique({where:{id:req.params.id},include});
  if(!car)return forbiddenNotFound(res);
  res.json(serializeCar(car,req.user.role,req.user.id));
}catch(e){next(e)} });
router.post('/',adminOnly,async(req,res,next)=>{try {
  const d=z.object({plate:nameField,brand:nameField,model:nameField,year:z.number().int().min(1900).max(2100),odo:z.number().int().nonnegative().default(0),color:z.string().trim().max(100).optional(),purchasePrice:amountField.optional(),seller:z.string().trim().max(200).optional(),phone:z.string().trim().max(30).optional()}).parse(req.body);
  const car=await prisma.car.create({data:{...d,plate:d.plate.toUpperCase()},include});
  await audit(prisma,req.user.id,'CAR_CREATED',car.id);
  res.status(201).json(serializeCar(car,'ADMIN'));
}catch(e){next(e)} });
router.put('/:id/assignments',adminOnly,async(req,res,next)=>{try {
  const {employeeIds}=z.object({employeeIds:z.array(z.string().min(1)).max(100)}).parse(req.body);
  const ids=[...new Set(employeeIds)];
  const car=await prisma.car.findUnique({where:{id:req.params.id}});
  if(!car)return forbiddenNotFound(res);
  if(car.status!=='INSPECTION')return res.status(409).json({message:'Chỉ phân công nhân viên khi xe đang kiểm định.'});
  const valid=await prisma.user.count({where:{id:{in:ids},role:'EMPLOYEE',active:true}});
  if(valid!==ids.length)return res.status(400).json({message:'Có nhân viên không tồn tại hoặc đang bị khóa.'});
  await prisma.$transaction(async tx=>{
    await tx.carInspectionAssignment.deleteMany({where:{carId:car.id}});
    if(ids.length)await tx.carInspectionAssignment.createMany({data:ids.map(employeeId=>({carId:car.id,employeeId,assignedById:req.user.id}))});
    await audit(tx,req.user.id,'INSPECTION_ASSIGNED',car.id,{employeeIds:ids});
  });
  res.json({employeeIds:ids});
}catch(e){next(e)} });
// Prevent bypassing the single-buyer deposit / payment / sold workflow.
// This generic endpoint is reserved for the ADMIN approval of a sale price.
router.patch('/:id',adminOnly,async(req,res,next)=>{try{
  const d=z.object({status:z.literal('FOR_SALE'),salePrice:amountField.positive()}).strict().parse(req.body);
  const result=await prisma.$transaction(async tx=>{
    const changed=await tx.car.updateMany({where:{id:req.params.id,status:'READY_FOR_REVIEW'},data:{status:'FOR_SALE',salePrice:d.salePrice}});
    if(!changed.count)return null;
    await audit(tx,req.user.id,'CAR_APPROVED_FOR_SALE',req.params.id,{salePrice:d.salePrice});
    return {id:req.params.id,status:'FOR_SALE',salePrice:d.salePrice};
  });
  if(!result)return res.status(409).json({message:'Xe chưa hoàn tất bảo dưỡng hoặc đã duyệt giá. Không thể cập nhật trạng thái trực tiếp.'});
  res.json(result);
}catch(e){next(e)} });
router.post('/:id/leads',adminOnly,async(req,res,next)=>{try{
  const data=z.object({name:nameField,phone:nameField,tiktok:z.string().trim().max(200).optional(),address:z.string().trim().max(500).optional(),note:z.string().trim().max(2000).optional()}).parse(req.body);
  const car=await prisma.car.findUnique({where:{id:req.params.id},select:{status:true}});
  if(!car)return forbiddenNotFound(res);
  if(!['FOR_SALE','CUSTOMER_CLOSED','DEPOSITED'].includes(car.status))return res.status(409).json({message:'Xe chưa được đưa lên kinh doanh.'});
  const out=await prisma.$transaction(async tx=>{
    const lead=await tx.salesLead.create({data:{carId:req.params.id,...data}});
    await tx.leadActivity.create({data:{carId:req.params.id,leadId:lead.id,createdById:req.user.id,kind:'INTEREST',content:data.note||'Đã ghi nhận khách quan tâm'}});
    await audit(tx,req.user.id,'SALES_LEAD_ADDED',req.params.id,{leadId:lead.id});
    return lead;
  });
  res.status(201).json(out);
}catch(e){next(e)} });
export default router;
