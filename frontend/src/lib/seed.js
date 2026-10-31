export const employees = [
  { id: 'u-admin', name: 'Quản trị viên', email: 'admin@garage.local', role: 'ADMIN', password: 'admin123' },
  { id: 'u-an', name: 'Nguyễn Hoàng An', email: 'an@garage.local', role: 'EMPLOYEE', password: '123456' },
  { id: 'u-binh', name: 'Trần Minh Bình', email: 'binh@garage.local', role: 'EMPLOYEE', password: '123456' },
  { id: 'u-chi', name: 'Lê Ngọc Chi', email: 'chi@garage.local', role: 'EMPLOYEE', password: '123456' },
];
export const initialCars = [
  { id:'CAR-2026-001', plate:'51K-123.45', brand:'Toyota', model:'Vios G', year:2022, odo:42000, color:'Trắng', purchasePrice:425000000, status:'MAINTENANCE', seller:'Nguyễn Văn Hùng', phone:'0901234567', createdAt:'2026-10-20', inspection:{}, maintenance:[{id:'MT-0001',task:'Thay dầu động cơ và lọc dầu',amount:1800000,note:'Kiểm tra tổng quát trước khi bàn giao',invoice:'hoa-don-bao-duong-demo.pdf',assignedTo:'u-an',createdBy:'u-admin',date:'2026-10-28',locked:false}], leads:[], warranty:[] },
  { id:'CAR-2026-002', plate:'51H-678.90', brand:'Honda', model:'City RS', year:2021, odo:51000, color:'Đen', purchasePrice:465000000, status:'FOR_SALE', seller:'Trần Quốc Bảo', phone:'0912345678', salePrice:519000000, createdAt:'2026-10-18', inspection:{}, maintenance:[], leads:[], warranty:[] },
  { id:'CAR-2026-003', plate:'60A-246.88', brand:'Mazda', model:'CX-5 Premium', year:2023, odo:28000, color:'Đỏ', purchasePrice:680000000, status:'INSPECTION', seller:'Phạm Minh Đức', phone:'0987654321', createdAt:'2026-10-25', inspection:{}, maintenance:[], leads:[], warranty:[] },
  { id:'CAR-2026-004', plate:'51G-888.12', brand:'Hyundai', model:'Accent AT', year:2020, odo:63000, color:'Bạc', purchasePrice:350000000, status:'DEPOSITED', seller:'Lê Thanh Tùng', phone:'0933332211', salePrice:399000000, deposit:20000000, createdAt:'2026-10-12', inspection:{}, maintenance:[], leads:[], warranty:[{id:'WAR-001',carId:'CAR-2026-004',description:'Thay dầu và lọc dầu theo cam kết',amount:1200000,date:'2026-10-28',status:'COMPLETED',createdBy:'u-admin'}] },
];
export const initialExpenses = [
  { id:'EXP-001', category:'Xăng dầu', amount:850000, description:'Chi phí đi xem xe tại Bình Dương', date:'2026-10-27', createdBy:'u-admin' },
  { id:'EXP-002', category:'Vận hành garage', amount:3200000, description:'Điện, nước tháng 10', date:'2026-10-26', createdBy:'u-admin' },
];
export const initialWarranty = [
  { id:'WAR-001', carId:'CAR-2026-004', description:'Thay dầu và lọc dầu theo cam kết', amount:1200000, date:'2026-10-28', status:'COMPLETED', createdBy:'u-admin' },
];
