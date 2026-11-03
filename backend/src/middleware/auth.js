import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

export async function auth(req, res, next) {
  try {
    const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
    const payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'garage-os' });
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.active || (user.googleSub && user.googleSub !== payload.googleSub)) return res.status(401).json({ message: 'Tài khoản hoặc phiên đăng nhập không hợp lệ.' });
    req.user = user;
    next();
  } catch { res.status(401).json({ message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' }); }
}
export const adminOnly = (req, res, next) => req.user?.role === 'ADMIN' ? next() : res.status(403).json({ message: 'Chỉ quản trị viên có quyền.' });
export async function canAccessCar(user, carId) {
  if (user.role === 'ADMIN') return !!(await prisma.car.findUnique({ where: { id: carId }, select: { id: true } }));
  return !!(await prisma.carInspectionAssignment.findUnique({ where: { carId_employeeId: { carId, employeeId: user.id } } }));
}
