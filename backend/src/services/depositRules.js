/** Pure VNĐ business rules; used by the multi-buyer deposit endpoints. */
export function paidTotal(payments) {
  return payments.reduce((total,p)=>total+Number(p.amount),0);
}
export function amountLeft(price,payments) {
  return Math.max(0,Number(price)-paidTotal(payments));
}
export function settlesInFull(price,payments,nextAmount) {
  const remaining=amountLeft(price,payments);
  return Number.isSafeInteger(nextAmount)&&nextAmount>0&&nextAmount===remaining;
}
export function settleStatus(reason) {
  return {CUSTOMER_FORFEIT:'FORFEITED',RETURN_DEPOSIT:'REFUNDED',COMPENSATE:'COMPENSATED'}[reason]||null;
}
export function validateSettlement(reason,received,returned,penalty) {
  if (![received,returned,penalty].every(v=>Number.isSafeInteger(v)&&v>=0)) return 'Tiền phải là số nguyên VNĐ không âm.';
  if (returned>received) return 'Không được hoàn vượt số tiền đã nhận.';
  if (reason==='CUSTOMER_FORFEIT' && (returned!==0 || penalty!==0)) return 'Bỏ cọc giữ toàn bộ tiền cọc, không hoàn hay đền thêm.';
  if (['RETURN_DEPOSIT','COMPENSATE'].includes(reason)&&returned!==received)return 'Phải hoàn đủ tiền cọc của khách.';
  if (reason==='RETURN_DEPOSIT'&&penalty!==0)return 'Trả cọc thường không có khoản đền thêm.';
  if (!settleStatus(reason))return 'Loại xử lý cọc không hợp lệ.';
  return null;
}
/** Clamp to month-end, including leap-year Feb 29. */
export function addWarrantyMonths(date,months) {
  if(!Number.isInteger(months)||months<0||months>120)throw Error('Thời hạn bảo hành không hợp lệ.');
  if(months===0)return null;
  const d=new Date(date),day=d.getUTCDate();
  const target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+months,1,d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds(),d.getUTCMilliseconds()));
  const daysInTarget=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  target.setUTCDate(Math.min(day,daysInTarget));
  return target;
}
