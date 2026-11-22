import { employees, initialCars, initialExpenses, initialWarranty } from './seed';
const read = (key, fallback) => { try { const v=localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
export const loadState = () => ({ cars:read('garage_cars',initialCars), expenses:read('garage_expenses',initialExpenses), warranty:read('garage_warranty',initialWarranty), users:read('garage_users',employees) });
export const saveState = (state) => { localStorage.setItem('garage_cars',JSON.stringify(state.cars)); localStorage.setItem('garage_expenses',JSON.stringify(state.expenses)); localStorage.setItem('garage_warranty',JSON.stringify(state.warranty)); localStorage.setItem('garage_users',JSON.stringify(state.users)); };
export const money = (n=0) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(n)||0);
export const today = () => new Date().toISOString().slice(0,10);
export const makeId = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}`;
export const statusText = { INSPECTION:'Chờ kiểm định', MAINTENANCE:'Đang bảo dưỡng', READY_FOR_REVIEW:'Chờ duyệt giá', FOR_SALE:'Đang bán', CUSTOMER_CLOSED:'Khách đã chốt', DEPOSITED:'Đã đặt cọc', SOLD:'Đã bán', CANCELLED:'Đã hủy' };

export const SESSION_MS = 24 * 60 * 60 * 1000;
const SESSION_KEY = 'garage_session';

export function readSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!raw) return { user: null, expiresAt: null, expired: false };
    if (raw.expiresAt && raw.user) {
      if (Date.now() > raw.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return { user: null, expiresAt: null, expired: true };
      }
      return { user: raw.user, expiresAt: raw.expiresAt, expired: false };
    }
    if (raw.email && raw.id) {
      const expiresAt = Date.now() + SESSION_MS;
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: raw, issuedAt: Date.now(), expiresAt }));
      return { user: raw, expiresAt, expired: false };
    }
    return { user: null, expiresAt: null, expired: false };
  } catch {
    return { user: null, expiresAt: null, expired: false };
  }
}

export function writeSession(user) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_MS;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, issuedAt, expiresAt }));
  return expiresAt;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
