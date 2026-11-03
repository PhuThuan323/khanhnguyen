import { Router } from 'express';
import { Readable } from 'node:stream';
import { prisma } from '../db.js';
import { canAccessCar } from '../middleware/auth.js';
import { signedMediaUrl } from '../services/cloudinary.js';
import { forbiddenNotFound } from '../lib.js';
const router=Router();
async function serve(req,res,asset,carId) {
  if(!asset || !await canAccessCar(req.user,carId))return forbiddenNotFound(res);
  const url=signedMediaUrl(asset.publicId,asset.resourceType||'image',asset.format);
  const upstream=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!upstream.ok||!upstream.body)return res.status(502).json({message:'Không thể tải ảnh/chứng từ từ Cloudinary.'});
  res.setHeader('Content-Type',asset.format==='pdf'?'application/pdf':asset.format==='png'?'image/png':asset.format==='webp'?'image/webp':'image/jpeg');
  res.setHeader('Content-Disposition','inline');
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  Readable.fromWeb(upstream.body).on('error',()=>res.destroy()).pipe(res);
}
router.get('/photos/:id',async(req,res,next)=>{try{
  const p=await prisma.inspectionPhoto.findUnique({where:{id:req.params.id},include:{block:{select:{carId:true}}}});
  await serve(req,res,p,p?.block.carId);
}catch(e){next(e)} });
router.get('/invoices/:id',async(req,res,next)=>{try{
  const i=await prisma.maintenanceInvoice.findUnique({where:{id:req.params.id},include:{record:{select:{carId:true,employeeId:true}}}});
  if(i&&req.user.role!=='ADMIN'&&i.record.employeeId!==req.user.id)return forbiddenNotFound(res);
  await serve(req,res,i,i?.record.carId);
}catch(e){next(e)} });
export default router;
