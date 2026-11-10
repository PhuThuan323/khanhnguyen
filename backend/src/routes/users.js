import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminOnly } from '../middleware/auth.js';
const router = Router();
router.use(adminOnly);
const select = { id:true,name:true,email:true,avatarUrl:true,role:true,active:true,createdAt:true };
router.get('/', async(req,res,next)=>{try { res.json(await prisma.user.findMany({orderBy:{createdAt:'desc'},select})); } catch(e){next(e)} });
router.post('/',async(req,res,next)=>{ try {
  const d=z.object({email:z.email().transform(v=>v.toLowerCase().trim()),name:z.string().trim().min(1).max(150),role:z.enum(['ADMIN','EMPLOYEE']).default('EMPLOYEE')}).parse(req.body);
  res.status(201).json(await prisma.user.create({data:d,select}));
} catch(e){next(e)} });
router.patch('/:id',async(req,res,next)=>{ try {
  if (req.params.id===req.user.id) return res.status(400).json({message:'Không thể tự thay đổi quyền/trạng thái của chính mình.'});
  const d=z.object({role:z.enum(['ADMIN','EMPLOYEE']).optional(),active:z.boolean().optional()}).refine(x=>x.role!==undefined||x.active!==undefined).parse(req.body);
  res.json(await prisma.user.update({where:{id:req.params.id},data:d,select}));
} catch(e){next(e)} });
export default router;
