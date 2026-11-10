/** Domain rules shared by sales routes and tests. */
export const canAcceptDeposit = status => ['FOR_SALE', 'CUSTOMER_CLOSED'].includes(status);
export const positiveVnd = n => Number.isSafeInteger(n) && n > 0 && n <= 999_999_999_999;
export const remainingBalance = (agreedPrice, paid) => Math.max(0, Math.round(Number(agreedPrice) - Number(paid)));
export const salePaidInFull = (agreedPrice, paid) => remainingBalance(agreedPrice, paid) === 0;

export function redactDeal(deal) {
  if (!deal) return null;
  return {
    id: deal.id,
    carId: deal.carId,
    buyerLeadId: deal.buyerLeadId,
    buyer: deal.buyer ? {
      id: deal.buyer.id, name: deal.buyer.name, phone: deal.buyer.phone,
      tiktok: deal.buyer.tiktok, address: deal.buyer.address,
    } : undefined,
    agreedPrice: Number(deal.agreedPrice),
    depositedAt: deal.depositedAt,
    soldAt: deal.soldAt,
    payments: (deal.payments || []).map(p => ({
      id: p.id, kind: p.kind, amount: Number(p.amount), note: p.note,
      receivedAt: p.receivedAt, createdBy: p.createdBy,
    })),
  };
}
