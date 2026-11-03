import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { auth } from '../middleware/auth.js';
const router = Router();
const googleClient = new OAuth2Client();
const profile = (user) => ({ id:user.id,email:user.email,name:user.name,avatarUrl:user.avatarUrl,role:user.role,active:user.active });
router.get('/me', auth, (req,res) => res.json({ user:profile(req.user) }));
router.post('/google', async(req,res,next) => { try {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) return res.status(503).json({ message:'Chưa cấu hình Google OAuth hoặc JWT_SECRET.' });
  const { credential } = z.object({ credential:z.string().min(20) }).parse(req.body);
  const ticket = await googleClient.verifyIdToken({ idToken:credential, audience:process.env.GOOGLE_CLIENT_ID });
  const p = ticket.getPayload();
  if (!p?.email_verified || !p.sub || !p.email) return res.status(401).json({ message:'Email Google chưa được xác thực.' });
  const email = p.email.toLowerCase();
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  let user = await prisma.user.findUnique({ where:{email} });
  if (!user) {
    if (!admins.includes(email)) return res.status(403).json({ message:'Email này chưa được Admin cấp quyền. Vui lòng liên hệ quản trị viên.' });
    user = await prisma.user.create({ data:{ email, name:p.name || email, avatarUrl:p.picture || null, googleSub:p.sub, role:'ADMIN' } });
  } else {
    if (user.googleSub && user.googleSub !== p.sub) return res.status(403).json({ message:'Tài khoản Google không khớp email đã đăng ký.' });
    if (!user.active) return res.status(403).json({ message:'Tài khoản đã bị khóa.' });
    user = await prisma.user.update({ where:{id:user.id}, data:{ googleSub:p.sub, avatarUrl:p.picture || null } });
  }
  const token = jwt.sign({ sub:user.id, googleSub:p.sub }, process.env.JWT_SECRET, { algorithm:'HS256', issuer:'garage-os', expiresIn:'8h' });
  res.json({ token, user:profile(user) });
} catch (err) { if (err.message?.includes('Token used too late') || err.message?.includes('Wrong recipient') || err.message?.includes('Invalid token')) return res.status(401).json({ message:'Không thể xác thực Google. Vui lòng thử đăng nhập lại.' }); next(err); } });
export default router;
