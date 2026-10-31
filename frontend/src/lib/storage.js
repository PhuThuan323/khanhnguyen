import { employees, initialCars, initialExpenses, initialWarranty } from './seed';
const read = (key, fallback) => { try { const v=localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
export const loadState = () => ({ cars:read('garage_cars',initialCars), expenses:read('garage_expenses',initialExpenses), warranty:read('garage_warranty',initialWarranty), users:read('garage_users',employees) });
export const saveState = (state) => { localStorage.setItem('garage_cars',JSON.stringify(state.cars)); localStorage.setItem('garage_expenses',JSON.stringify(state.expenses)); localStorage.setItem('garage_warranty',JSON.stringify(state.warranty)); localStorage.setItem('garage_users',JSON.stringify(state.users)); };
export const money = (n=0) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(n)||0);
export const today = () => new Date().toISOString().slice(0,10);
export const makeId = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}`;
export const statusText = { INSPECTION:'Chờ kiểm định', MAINTENANCE:'Đang bảo dưỡng', READY_FOR_REVIEW:'Chờ duyệt giá', FOR_SALE:'Đang bán', CUSTOMER_CLOSED:'Khách đã chốt', DEPOSITED:'Đã đặt cọc', SOLD:'Đã bán', CANCELLED:'Đã hủy' };
