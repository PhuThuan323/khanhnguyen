import test from 'node:test';
import assert from 'node:assert/strict';
import {canRecordMaintenance,canCloseInspection,validateExpensePayee,addVehicleDocumentCost} from '../src/services/yc03Rules.js';
import {summarizeFinance} from '../src/services/reporting.js';
test('Bảo dưỡng vẫn bổ sung được khi xe đã vào kho, có cọc hoặc đã bán',()=>{
 for(const status of ['MAINTENANCE','READY_FOR_REVIEW','FOR_SALE','CUSTOMER_CLOSED','DEPOSITED','SOLD'])assert.equal(canRecordMaintenance(status),true);
 for(const status of ['INSPECTION','CANCELLED',undefined])assert.equal(canRecordMaintenance(status),false);
});
test('Chỉ Admin có thể chuyển trạng thái kiểm định (không cần chữ ký chủ xe)',()=>{
 assert.equal(canCloseInspection('ADMIN','INSPECTION'),true);
 assert.equal(canCloseInspection('EMPLOYEE','INSPECTION'),false);
 assert.equal(canCloseInspection('ADMIN','SOLD'),false);
});
test('Chi phí vận hành gắn theo nhân viên hoặc xưởng hợp lệ',()=>{
 assert.match(validateExpensePayee('EMPLOYEE',null,''),/nhân viên/);
 assert.equal(validateExpensePayee('EMPLOYEE','staff-1',''), '');
 assert.equal(validateExpensePayee('WORKSHOP',null,'Xưởng Nam'), '');
 assert.match(validateExpensePayee('WORKSHOP',null,''),/xưởng/);
});
test('Chi phí hồ sơ xe được cộng đúng vào lợi nhuận xe đã bán',()=>{
 assert.equal(addVehicleDocumentCost(300_000_000,{cost:2_000_000}),302_000_000);
 const summary=summarizeFinance({soldDeals:[{agreedPrice:500_000_000,car:{purchasePrice:400_000_000,maintenance:[{amount:10_000_000}],vehicleDocument:{cost:2_000_000}}}],payments:[],acquiredCars:[],maintenance:[],expenses:[],warranty:[],documents:[]});
 assert.equal(summary.costOfCarsSold,412_000_000);
 assert.equal(summary.estimatedProfit,88_000_000);
});
test('Bảo dưỡng bổ sung sau ngày bán không sửa ngược lãi của tháng bán',()=>{
 const soldAt='2026-10-15T08:00:00.000Z';
 const car={purchasePrice:400_000_000,maintenance:[{amount:10_000_000,performedAt:'2026-10-10T08:00:00.000Z'},{amount:5_000_000,performedAt:'2026-11-10T08:00:00.000Z'}],vehicleDocument:{cost:2_000_000,createdAt:'2026-11-09T08:00:00.000Z'}};
 const october=summarizeFinance({soldDeals:[{agreedPrice:500_000_000,soldAt,car}],payments:[],acquiredCars:[],maintenance:[],expenses:[],warranty:[],documents:[]});
 assert.equal(october.costOfCarsSold,410_000_000);
 assert.equal(october.estimatedProfit,90_000_000);
 const november=summarizeFinance({soldDeals:[],payments:[],acquiredCars:[],maintenance:[{amount:5_000_000,performedAt:'2026-11-10T08:00:00.000Z',car:{deal:{soldAt}}}],expenses:[],warranty:[],documents:[{cost:2_000_000,createdAt:'2026-11-09T08:00:00.000Z',car:{deal:{soldAt}}}]});
 assert.equal(november.estimatedProfit,-7_000_000);
 assert.equal(november.totalCashOut,7_000_000);
});
