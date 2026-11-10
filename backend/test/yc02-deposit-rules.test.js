import test from 'node:test';
import assert from 'node:assert/strict';
import {paidTotal,amountLeft,settlesInFull,validateSettlement,settleStatus,addWarrantyMonths} from '../src/services/depositRules.js';

test('Hai khách có số dư độc lập, không cộng chéo tiền cọc',()=>{
 const a=[{amount:100_000_000},{amount:80_000_000}];
 const b=[{amount:50_000_000}];
 assert.equal(paidTotal(a),180_000_000);
 assert.equal(amountLeft(300_000_000,a),120_000_000);
 assert.equal(amountLeft(300_000_000,b),250_000_000);
 assert.equal(settlesInFull(300_000_000,a,120_000_000),true);
 assert.equal(settlesInFull(300_000_000,b,120_000_000),false);
});

test('Đền cọc không được ghi đã hoàn nếu chưa trả đủ',()=>{
 assert.match(validateSettlement('COMPENSATE',80_000_000,60_000_000,5_000_000),/hoàn đủ/);
 assert.equal(validateSettlement('COMPENSATE',80_000_000,80_000_000,5_000_000),null);
 assert.equal(settleStatus('COMPENSATE'),'COMPENSATED');
 assert.match(validateSettlement('CUSTOMER_FORFEIT',80_000_000,10_000_000,0),/Bỏ cọc/);
 assert.equal(validateSettlement('CUSTOMER_FORFEIT',80_000_000,0,0),null);
});

test('Số tiền trả cọc bắt buộc đủ số đã thu, không ghi âm hay lẻ',()=>{
 assert.match(validateSettlement('RETURN_DEPOSIT',70_000_000,0,0),/hoàn đủ/);
 assert.match(validateSettlement('RETURN_DEPOSIT',70_000_000,-1,0),/VNĐ/);
 assert.match(validateSettlement('RETURN_DEPOSIT',70_000_000,70_000_000,1000),/đền thêm/);
 assert.equal(validateSettlement('RETURN_DEPOSIT',70_000_000,70_000_000,0),null);
});

test('Ngày bảo hành cộng theo tháng thực, không nhảy quá tháng khi ngày 31',()=>{
 assert.equal(addWarrantyMonths(new Date('2027-01-31T10:00:00Z'),1).toISOString(),'2027-02-28T10:00:00.000Z');
 assert.equal(addWarrantyMonths(new Date('2028-01-31T10:00:00Z'),1).toISOString(),'2028-02-29T10:00:00.000Z');
 assert.equal(addWarrantyMonths(new Date('2027-06-10T10:00:00Z'),0),null);
});
