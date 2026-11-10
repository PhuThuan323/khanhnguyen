import { z } from 'zod';
export const nameField = z.string().trim().min(1).max(200);
export const amountField = z.number().int().safe().nonnegative().max(999999999999);
export const carStatus = z.enum(['INSPECTION','MAINTENANCE','READY_FOR_REVIEW','FOR_SALE','CUSTOMER_CLOSED','DEPOSITED','SOLD','CANCELLED']);
export function audit(prisma, userId, action, carId = null, detail = null) { return prisma.auditLog.create({ data: { userId, action, ...(carId ? {carId} : {}), ...(detail == null ? {} : {detail}) } }); }
export function forbiddenNotFound(res) { return res.status(404).json({ message: 'Không tìm thấy hồ sơ hoặc không có quyền.' }); }
export function parseDate(date) { return new Date(`${date}T12:00:00.000Z`); }
