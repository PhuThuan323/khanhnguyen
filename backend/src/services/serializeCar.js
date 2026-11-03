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
    id: m.id, task: m.task, ...(isAdmin ? { amount: Number(m.amount) } : {}), note: m.note, date: m.createdAt,
    assignedTo: m.employeeId, createdBy: m.employeeId, employee: m.employee,
    invoices: m.invoices.map(i => ({ id: i.id, originalName: i.originalName, format: i.format, createdAt: i.createdAt, uploadedById: i.uploadedById })),
  }));
  const base = {
    id: car.id, plate: car.plate, brand: car.brand, model: car.model, year: car.year, odo: car.odo, color: car.color, status: car.status,
    createdAt: car.createdAt, updatedAt: car.updatedAt,
    inspection: { inspectedAt: car.inspectedAt, checks: Object.fromEntries(inspectionBlocks.map(b => [b.section, b.condition])) },
    inspectionBlocks, inspectionAssignees: car.assignments.map(a => a.employeeId),
    assignments: isAdmin ? car.assignments.map(a => a.employee) : [],
    maintenance,
  };
  if (isAdmin) Object.assign(base, {
    purchasePrice: numberOrNull(car.purchasePrice), seller: car.seller, phone: car.phone,
    salePrice: numberOrNull(car.salePrice), deposit: numberOrNull(car.deposit),
    leads: car.leads.map(l => ({
      id: l.id, carId: l.carId, name: l.name, tiktok: l.tiktok, phone: l.phone, address: l.address, note: l.note, createdAt: l.createdAt,
      activities: (l.activities || []).map(a => ({ id: a.id, kind: a.kind, content: a.content, createdAt: a.createdAt, createdBy: a.createdBy })),
    })),
    deal: redactDeal(car.deal),
    warranty: car.warranty.map(w => ({ ...w, amount: Number(w.amount) })),
  });
  return base;
}
