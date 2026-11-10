import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly, canAccessCar } from '../middleware/auth.js';
import { audit, forbiddenNotFound, amountField, nameField } from '../lib.js';
import {serializeCar,numberOrNull} from '../services/serializeCar.js';
import {sendJson} from '../services/jsonResponse.js';
const router=Router();
const include = {
  assignments:{include:{employee:{select:{id:true,name:true,email:true,active:true}}}},
  blocks:{include:{photos:{include:{uploadedBy:{select:{id:true,name:true}}},orderBy:{createdAt:'asc'}},comments:{include:{author:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'asc'}},
  maintenance:{include:{employee:{select:{id:true,name:true,email:true}},invoices:{orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'desc'}},
  leads:{include:{activities:{include:{createdBy:{select:{id:true,name:true}}},orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'asc'}},
  deal:{include:{buyer:{select:{id:true,name:true,phone:true,tiktok:true,address:true}},payments:{include:{createdBy:{select:{id:true,name:true}}},orderBy:{receivedAt:'asc'}}}},
  warranty:{orderBy:{date:'desc'}},
  depositSettlements:{orderBy:{createdAt:'desc'}},
  commissions:{orderBy:{createdAt:'desc'}},
  vehicleDocument:true,
  competingDeposits:{include:{lead:{select:{id:true,name:true,phone:true}},payments:{orderBy:{createdAt:'asc'}},settlements:{orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'asc'}}
};
// YC04 lightweight paginated vehicle catalog. Does not hydrate historical relations.
// Existing GET /cars remains backward-compatible for operational modules.
const catalogParams = z.object({
  q:z.string().trim().max(120).optional(),
  status:z.enum(['INSPECTION','MAINTENANCE','READY_FOR_REVIEW','FOR_SALE','CUSTOMER_CLOSED','DEPOSITED','SOLD','CANCELLED']).optional(),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(100).default(25)
});
router.get('/catalog',async(req,res,next)=>{try{
  const {q,status,page,pageSize}=catalogParams.parse(req.query);
  const access=req.user.role==='ADMIN'?{}:{assignments:{some:{employeeId:req.user.id}}};
  const search=q&&q.length>=2?{OR:[
    {plate:{contains:q,mode:'insensitive'}},{brand:{contains:q,mode:'insensitive'}},
    {model:{contains:q,mode:'insensitive'}},
    {vehicleDocument:{is:{customerName:{contains:q,mode:'insensitive'}}}},
    ...(req.user.role==='ADMIN'?[{leads:{some:{OR:[{name:{contains:q,mode:'insensitive'}},{phone:{contains:q}}]}}},{deal:{is:{buyer:{is:{name:{contains:q,mode:'insensitive'}}}}}}]:[])
  ]}:{};
  const where={AND:[access,search,...(status?[{status}]:[])]};
  const [total,rows]=await prisma.$transaction([
    prisma.car.count({where}),
    prisma.car.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*pageSize,take:pageSize,
      select:{id:true,plate:true,brand:true,model:true,year:true,status:true,createdAt:true,updatedAt:true,coverPhotoId:true,
        inspectionDueAt:true,...(req.user.role==='ADMIN'?{purchasePrice:true,salePrice:true,discount:true,warrantyUntil:true,deal:{select:{soldAt:true,buyer:{select:{name:true}}}}}:{})}})
  ]);
  res.set('Cache-Control','private, no-cache');
  res.json({items:rows.map(c=>({...c,...(req.user.role==='ADMIN'?{purchasePrice:numberOrNull(c.purchasePrice),salePrice:numberOrNull(c.salePrice),discount:Number(c.discount||0)}:{})})),page,pageSize,total,hasMore:page*pageSize<total});
}catch(e){next(e)}});
router.get('/', async(req,res,next)=>{ try {
  const where=req.user.role==='ADMIN'?{}:{assignments:{some:{employeeId:req.user.id}}};
  const cars=await prisma.car.findMany({where,include,orderBy:{createdAt:'desc'}});
  await sendJson(req,res,cars.map(c=>serializeCar(c,req.user.role,req.user.id)));
} catch(e){next(e)} });

// YC01: Admin may revise vehicle details, discount and warranty without bypassing sale state transitions.
router.put('/:id/details',adminOnly,async(req,res,next)=>{try{
 const d=z.object({plate:z.string().trim().min(1).optional(),brand:z.string().trim().min(1).optional(),model:z.string().trim().min(1).optional(),year:z.number().int().min(1900).max(2100).optional(),odo:z.number().int().nonnegative().optional(),color:z.string().nullable().optional(),purchasePrice:amountField.optional(),salePrice:amountField.optional(),discount:amountField.optional(),inspectionDueAt:z.iso.datetime().nullable().optional(),coverPhotoId:z.string().nullable().optional(),warrantyMonths:z.number().int().min(0).max(120).optional()}).strict().parse(req.body);
 const old=await prisma.car.findUnique({where:{id:req.params.id}});if(!old)return forbiddenNotFound(res);
 if(d.coverPhotoId){const photo=await prisma.inspectionPhoto.findFirst({where:{id:d.coverPhotoId,block:{carId:old.id}}});if(!photo)return res.status(400).json({message:'Ảnh đại diện phải là ảnh kiểm định thuộc xe này.'});}
 if(d.discount!==undefined&&Number(d.discount)>Number(d.salePrice??old.salePrice??0))return res.status(400).json({message:'Giá bớt không được vượt giá dự kiến.'});
 if(['SOLD','DEPOSITED'].includes(old.status)&&(d.salePrice!==undefined||d.discount!==undefined))return res.status(409).json({message:'Đang có cọc hoặc xe đã bán: không được thay đổi giá đã thỏa thuận.'});
 const updated=await prisma.car.update({where:{id:old.id},data:d});await audit(prisma,req.user.id,'CAR_DETAILS_UPDATED',old.id,{fields:Object.keys(d)});res.json({ok:true,id:updated.id});
}catch(e){next(e)}});
// Search endpoint: no full-list dropdown; minimum two characters and bounded result size.
router.get('/lookup/vehicles',async(req,res,next)=>{try{
 const q=String(req.query.q||'').trim().slice(0,120);
 if(q.length<2)return res.json([]);
 const term=q.replace(/\s+/g,' ').trim();
 const terms=term.split(/[\s-]+/).filter(Boolean);
 const access=req.user.role==='ADMIN'?{}:{assignments:{some:{employeeId:req.user.id}}};
 const where={AND:[access,{OR:[{plate:{contains:term,mode:'insensitive'}},{brand:{contains:term,mode:'insensitive'}},{model:{contains:term,mode:'insensitive'}},{seller:{contains:term,mode:'insensitive'}},{vehicleDocument:{is:{customerName:{contains:term,mode:'insensitive'}}}},{phone:{contains:term}},{leads:{some:{OR:[{name:{contains:term,mode:'insensitive'}},{phone:{contains:term}}]}}},{deal:{is:{buyer:{is:{OR:[{name:{contains:term,mode:'insensitive'}},{phone:{contains:term}}]}}}}},...(terms.length>1?[{AND:[{plate:{contains:terms[0],mode:'insensitive'}},{leads:{some:{name:{contains:terms.slice(1).join(' '),mode:'insensitive'}}}}]}]:[])]}]};
 const rows=await prisma.car.findMany({where,select:{id:true,plate:true,brand:true,model:true,status:true,deal:{select:{buyer:{select:{name:true,phone:true}},soldAt:true}},vehicleDocument:{select:{customerName:true}}},orderBy:{createdAt:'desc'},take:25});
 res.json(rows.map(x=>({id:x.id,plate:x.plate,brand:x.brand,model:x.model,status:x.status,buyer:req.user.role==='ADMIN'?(x.deal?.buyer?.name||x.vehicleDocument?.customerName||''):'',...(req.user.role==='ADMIN'?{phone:x.deal?.buyer?.phone||''}:{})})));
}catch(e){next(e)}});
router.get('/lookup/customer',adminOnly,async(req,res,next)=>{try{
 const q=String(req.query.q||'').trim();if(q.length<2)return res.json([]);
 const leads=await prisma.salesLead.findMany({where:{OR:[{name:{contains:q,mode:'insensitive'}},{phone:{contains:q}}]},include:{car:{select:{id:true,plate:true,brand:true,model:true,status:true}}},take:100,orderBy:{createdAt:'desc'}});res.json(leads);
}catch(e){next(e)}});

router.get('/:id',async(req,res,next)=>{try {
  if(!await canAccessCar(req.user,req.params.id))return forbiddenNotFound(res);
  const car=await prisma.car.findUnique({where:{id:req.params.id},include});
  if(!car)return forbiddenNotFound(res);
  res.json(serializeCar(car,req.user.role,req.user.id));
}catch(e){next(e)} });
router.post('/',adminOnly,async(req,res,next)=>{try {
  const d=z.object({plate:nameField,brand:nameField,model:nameField,year:z.number().int().min(1900).max(2100),odo:z.number().int().nonnegative().default(0),color:z.string().trim().max(100).optional(),purchasePrice:amountField.optional(),seller:z.string().trim().max(200).optional(),phone:z.string().trim().max(30).optional(),inspectionDueAt:z.iso.datetime().optional()}).parse(req.body);
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
  const cover=await prisma.car.findUnique({where:{id:req.params.id},select:{coverPhotoId:true}});
  if(!cover?.coverPhotoId)return res.status(409).json({message:'Cần chọn ảnh đại diện xe từ ảnh kiểm định trước khi đưa xe lên bán.'});
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
