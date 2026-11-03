import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeCar } from '../src/services/serializeCar.js';
import { detectedFormat } from '../src/services/filetypes.js';
const car={id:'car01',plate:'51A-12345',brand:'Toyota',model:'Vios',year:2020,odo:5000,color:'Trắng',status:'INSPECTION',createdAt:new Date(),updatedAt:new Date(),inspectedAt:null,
  purchasePrice:350000000,seller:'Người bán bí mật',phone:'0900000000',salePrice:420000000,deposit:null,
  assignments:[{employeeId:'staff-01',employee:{id:'staff-01',name:'Kiểm định viên',email:'staff@example.com'}}],
  blocks:[{id:'block01',section:'Động cơ',condition:'Cần theo dõi',photos:[{id:'photo01',blockId:'block01',originalName:'xe.jpg',uploadedById:'staff-01',uploadedBy:{id:'staff-01',name:'Kiểm định viên'},createdAt:new Date(),publicId:'private-cloudinary-id'}],comments:[{id:'comment01',content:'Động cơ cần vệ sinh',authorId:'staff-01',author:{id:'staff-01',name:'Kiểm định viên',email:'staff@example.com'},createdAt:new Date()}]}],
  maintenance:[{id:'m01',task:'Thay nhớt',amount:1000000,note:'',employeeId:'staff-01',createdAt:new Date(),employee:{id:'staff-01',name:'Kiểm định viên'},invoices:[{id:'invoice01',format:'pdf',originalName:'hoa-don.pdf',publicId:'private-pdf-id'}]}],leads:[],warranty:[]};
test('Nhân viên không nhận trường giá thu mua, tên, số điện thoại người bán',()=>{
  const out=serializeCar(car,'EMPLOYEE','staff-01');
  for(const field of ['salePrice','deposit','deal','leads','warranty','purchasePrice','seller','phone']) assert.equal(field in out,false);
  assert.equal('amount' in out.maintenance[0] || false, false);
  assert.equal('purchasePrice' in out,false);assert.equal('seller' in out,false);assert.equal('phone' in out,false);
  assert.equal(JSON.stringify(out).includes('Người bán bí mật'),false);
  assert.equal(JSON.stringify(out).includes('0900000000'),false);
  assert.equal(JSON.stringify(out).includes('private-cloudinary-id'),false);
  assert.equal(JSON.stringify(out).includes('private-pdf-id'),false);
});
test('Admin thấy thông tin thu mua và tác giả nhận xét',()=>{
  const out=serializeCar(car,'ADMIN');assert.equal(out.purchasePrice,350000000);
  assert.equal(out.seller,'Người bán bí mật');assert.equal(out.phone,'0900000000');
  assert.equal(out.inspectionBlocks[0].comments[0].author.name,'Kiểm định viên');
  assert.equal(out.maintenance[0].invoices[0].originalName,'hoa-don.pdf');
});
test('Kiểm tra định dạng file bằng magic bytes',()=>{
  assert.equal(detectedFormat(Buffer.from([255,216,255,1])),'jpg');
  assert.equal(detectedFormat(Buffer.from('%PDF-1.7\n')),'pdf');
  assert.equal(detectedFormat(Buffer.from('GIF89a')) ,null);
});
