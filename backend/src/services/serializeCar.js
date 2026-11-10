import { redactDeal } from './salesLogic.js';
export const numberOrNull = (n) => n === null || n === undefined ? null : Number(n);

/** Employee DTO is intentionally allowlisted. Never spread raw Prisma car into staff API. */
export function serializeCar(car, role, userId = '') {
  const inspectionBlocks = car.blocks.map(b => ({
    id: b.id, section: b.section, condition: b.condition,
    photos: b.photos.map(p => ({ id: p.id, blockId: p.blockId, originalName: p.originalName, uploadedById: p.uploadedById, uploadedBy: p.uploadedBy, createdAt: p.createdAt })),
    comments: b.comments.map(c => ({ id: c.id, content: c.content, authorId: c.authorId, author: c.author, createdAt: c.createdAt })),
  }));
  const isAdmin = role === 'ADMIN';
  const maintenance = (isAdmin ? car.maintenance : car.maintenance.filter(m => m.employeeId === userId)).map(m => ({
    id: m.id, task: m.task, category:m.category, performedBy:m.performedBy, performedAt:m.performedAt, ...(isAdmin ? { amount: Number(m.amount) } : {}), note: m.note, date: m.createdAt,
    assignedTo: m.employeeId, createdBy: m.employeeId, employee: m.employee,
    invoices: m.invoices.map(i => ({ id: i.id, originalName: i.originalName, format: i.format, createdAt: i.createdAt, uploadedById: i.uploadedById })),
  }));
  const soldDate=car.deal?.soldAt||null;
  const publicCode=`${car.plate.replace(/[^A-Z0-9]/gi,'').toUpperCase()}-${(car.deal?.buyer?.name||car.competingDeposits?.find(o=>o.status==='ACTIVE')?.lead?.name||car.vehicleDocument?.customerName||'CHUA-CO-KHACH').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').replace(/[^A-Za-z0-9 ]/g,'').trim().replace(/\s+/g,'-').toUpperCase()}`;
  const aftersaleCode=car.deal?.soldAt?`${car.plate.replace(/[^A-Z0-9]/gi,'').toUpperCase()}-${new Date(car.deal.soldAt).toISOString().slice(0,10).replace(/-/g,'')}`:null;
  const base = {
    profileCode:publicCode, aftersaleCode,
    id: car.id, plate: car.plate, brand: car.brand, model: car.model, year: car.year, odo: car.odo, color: car.color, status: car.status,
    createdAt: car.createdAt, updatedAt: car.updatedAt, inspectionDueAt:car.inspectionDueAt, coverPhotoId:car.coverPhotoId,
    inspection: { inspectedAt: car.inspectedAt, checks: Object.fromEntries(inspectionBlocks.map(b => [b.section, b.condition])) },
    inspectionBlocks, inspectionAssignees: car.assignments.map(a => a.employeeId),
    assignments: isAdmin ? car.assignments.map(a => a.employee) : [],
    maintenance,
  };
  if (isAdmin) Object.assign(base, {
    purchasePrice: numberOrNull(car.purchasePrice), seller: car.seller, phone: car.phone,
    salePrice: numberOrNull(car.salePrice), discount:Number(car.discount||0), effectivePrice:Math.max(0,Number(car.salePrice||0)-Number(car.discount||0)), warrantyMonths:car.warrantyMonths,warrantyUntil:car.warrantyUntil, depositSettlements:(car.depositSettlements||[]).map(x=>({...x,depositAmount:Number(x.depositAmount),returnedAmount:Number(x.returnedAmount),penaltyAmount:Number(x.penaltyAmount)})), deposit: numberOrNull(car.deposit),
    leads: car.leads.map(l => ({
      id: l.id, carId: l.carId, name: l.name, tiktok: l.tiktok, phone: l.phone, address: l.address, note: l.note, createdAt: l.createdAt,
      activities: (l.activities || []).map(a => ({ id: a.id, kind: a.kind, content: a.content, createdAt: a.createdAt, createdBy: a.createdBy })),
    })),
    deal: redactDeal(car.deal),
    commissions:(car.commissions||[]).map(x=>({...x,amount:Number(x.amount)})),
    deposits:(car.competingDeposits||[]).map(o=>({id:o.id,leadId:o.leadId,lead:o.lead,status:o.status,agreedPrice:Number(o.agreedPrice),createdAt:o.createdAt,collectorIds:o.collectorIds,payments:o.payments.map(p=>({...p,amount:Number(p.amount)})),settlements:o.settlements.map(r=>({...r,returnedAmount:Number(r.returnedAmount),penaltyAmount:Number(r.penaltyAmount)}))})),
    warranty: car.warranty.map(w => ({ ...w, amount: Number(w.amount) })),
    vehicleDocument: car.vehicleDocument ? {...car.vehicleDocument,cost:Number(car.vehicleDocument.cost)} : null,
  });
  return base;
}
