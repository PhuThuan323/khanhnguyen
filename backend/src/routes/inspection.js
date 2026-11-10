import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly, canAccessCar } from '../middleware/auth.js';
import { uploadBuffer,deleteCloudAsset } from '../services/cloudinary.js';
import { uploadSingle,requireUpload,imageOnly } from '../middleware/upload.js';
import { audit,forbiddenNotFound } from '../lib.js';
import {canCloseInspection} from '../services/yc03Rules.js';
const router=Router();
const sections=['Ca Bô - Hầm Máy','4 cửa - 4 nách','Cốp Xe','Gầm','Bên ngoài xe','Nội thất','Đồng hồ','Điện xe - Máy lạnh','Động Cơ','Số cà'];
const conditions=['Chưa kiểm tra','Tốt','Cần theo dõi','Cần sửa chữa'];
async function canEditInspection(carId) { const c=await prisma.car.findUnique({where:{id:carId},select:{status:true}}); return c?.status==='INSPECTION'; }

router.put('/cars/:carId/blocks/:section',adminOnly,async(req,res,next)=>{try{
  const section=decodeURIComponent(req.params.section);
  if(!sections.includes(section))return res.status(400).json({message:'Hạng mục không hợp lệ.'});
  if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
  if(!await canEditInspection(req.params.carId))return res.status(409).json({message:'Kiểm định đã chốt. Không được sửa kết quả, ảnh hoặc nhận xét.'});
  const {condition}=z.object({condition:z.enum(conditions)}).strict().parse(req.body);
  const block=await prisma.inspectionBlock.upsert({where:{carId_section:{carId:req.params.carId,section}},create:{carId:req.params.carId,section,condition},update:{condition}});
  await audit(prisma,req.user.id,'INSPECTION_RESULT_UPDATED',req.params.carId,{section,condition});
  res.json(block);
}catch(e){next(e)} });
// Nhân viên chỉ thêm nhận xét/ảnh, không được tự tạo hoặc sửa kết luận tình trạng.
router.post('/cars/:carId/blocks/:section/comments',async(req,res,next)=>{try{
  const section=decodeURIComponent(req.params.section);
  if(!sections.includes(section))return res.status(400).json({message:'Hạng mục không hợp lệ.'});
  if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
  if(!await canEditInspection(req.params.carId))return res.status(409).json({message:'Kiểm định đã chốt. Không được sửa kết quả, ảnh hoặc nhận xét.'});
  const {content}=z.object({content:z.string().trim().min(1).max(3000)}).parse(req.body);
  const block=await prisma.inspectionBlock.upsert({where:{carId_section:{carId:req.params.carId,section}},create:{carId:req.params.carId,section},update:{}});
  const comment=await prisma.inspectionComment.create({data:{blockId:block.id,authorId:req.user.id,content},include:{author:{select:{id:true,name:true,email:true}}}});
  await audit(prisma,req.user.id,'INSPECTION_COMMENT_ADDED',req.params.carId,{section,commentId:comment.id});
  res.status(201).json(comment);
}catch(e){next(e)} });
router.post('/cars/:carId/blocks/:section/photos',imageOnly,uploadSingle,requireUpload,async(req,res,next)=>{try{
  const section=decodeURIComponent(req.params.section);
  if(!sections.includes(section))return res.status(400).json({message:'Hạng mục không hợp lệ.'});
  if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
  if(!await canEditInspection(req.params.carId))return res.status(409).json({message:'Kiểm định đã chốt. Không được sửa kết quả, ảnh hoặc nhận xét.'});
  const block=await prisma.inspectionBlock.upsert({where:{carId_section:{carId:req.params.carId,section}},create:{carId:req.params.carId,section},update:{}});
  const cloud=await uploadBuffer(req.file.buffer,{folder:`garage-os/cars/${req.params.carId}/inspection`});
  try{
    const photo=await prisma.$transaction(async tx=>{
      const p=await tx.inspectionPhoto.create({data:{blockId:block.id,publicId:cloud.public_id,format:cloud.format||req.file.detectedFormat,originalName:req.file.originalname.slice(0,255),uploadedById:req.user.id}});
      await audit(tx,req.user.id,'INSPECTION_PHOTO_UPLOADED',req.params.carId,{section,photoId:p.id});
      return p;
    });
    res.status(201).json(photo);
  }catch(e){await deleteCloudAsset(cloud.public_id).catch(()=>{});throw e}
}catch(e){next(e)} });
router.put('/photos/:id',imageOnly,uploadSingle,requireUpload,async(req,res,next)=>{try{
  const old=await prisma.inspectionPhoto.findUnique({where:{id:req.params.id},include:{block:true}});
  if(!old||!await canAccessCar(req.user,old.block.carId))return forbiddenNotFound(res);
  if(!await canEditInspection(old.block.carId))return res.status(409).json({message:'Không thể thay ảnh của kiểm định đã chốt.'});
  if(req.user.role!=='ADMIN'&&old.uploadedById!==req.user.id)return res.status(403).json({message:'Chỉ được thay ảnh do chính mình tải lên.'});
  const cloud=await uploadBuffer(req.file.buffer,{folder:`garage-os/cars/${old.block.carId}/inspection`});
  let photo;
  try {
    photo=await prisma.$transaction(async tx=>{
      const p=await tx.inspectionPhoto.update({where:{id:old.id,publicId:old.publicId},data:{publicId:cloud.public_id,format:cloud.format||req.file.detectedFormat,originalName:req.file.originalname.slice(0,255),uploadedById:req.user.id,createdAt:new Date()}});
      await audit(tx,req.user.id,'INSPECTION_PHOTO_REPLACED',old.block.carId,{photoId:old.id,section:old.block.section});
      return p;
    });
  } catch(e) {await deleteCloudAsset(cloud.public_id).catch(()=>{});throw e}
  await deleteCloudAsset(old.publicId).catch(err=>console.warn('Không thể xóa ảnh Cloudinary cũ:',err.message));
  res.json(photo);
}catch(e){next(e)} });
router.delete('/photos/:id',async(req,res,next)=>{try{
  const photo=await prisma.inspectionPhoto.findUnique({where:{id:req.params.id},include:{block:true}});
  if(!photo||!await canAccessCar(req.user,photo.block.carId))return forbiddenNotFound(res);
  if(!await canEditInspection(photo.block.carId))return res.status(409).json({message:'Không thể xóa ảnh của kiểm định đã chốt.'});
  if(req.user.role!=='ADMIN'&&photo.uploadedById!==req.user.id)return res.status(403).json({message:'Chỉ được xóa ảnh do chính mình tải lên.'});
  await prisma.$transaction(async tx=>{
    await tx.inspectionPhoto.delete({where:{id:photo.id}});
    await audit(tx,req.user.id,'INSPECTION_PHOTO_DELETED',photo.block.carId,{section:photo.block.section,photoId:photo.id});
  });
  await deleteCloudAsset(photo.publicId).catch(e=>console.warn('Không thể dọn ảnh cũ trên Cloudinary:',e.message));
  res.status(204).end();
}catch(e){next(e)} });
router.put('/cars/:carId/complete',adminOnly,async(req,res,next)=>{try{
  if(!await canAccessCar(req.user,req.params.carId))return forbiddenNotFound(res);
  if(!canCloseInspection(req.user.role,(await prisma.car.findUnique({where:{id:req.params.carId},select:{status:true}}))?.status))return res.status(409).json({message:'Xe không ở trạng thái kiểm định hoặc đã được chốt.'});
  // YC03: Admin explicitly changes inspection status; no owner sign-off or hard checklist gate.
  const blocks=await prisma.inspectionBlock.findMany({where:{carId:req.params.carId},select:{section:true,condition:true}});
  const doneSections=blocks.filter(x=>x.condition!=='Chưa kiểm tra').map(x=>x.section);
  const changed=await prisma.$transaction(async tx=>{
    const done=await tx.car.updateMany({where:{id:req.params.carId,status:'INSPECTION'},data:{inspectedAt:new Date(),status:'MAINTENANCE'}});
    if(!done.count)return false;
    await audit(tx,req.user.id,'INSPECTION_COMPLETED',req.params.carId,{completedSections:doneSections,remainingSections:sections.filter(x=>!doneSections.includes(x))});
    return true;
  });
  if(!changed)return res.status(409).json({message:'Kiểm định đã được chốt trước đó.'});
  res.json({ok:true});
}catch(e){next(e)} });
export default router;
