export function carCost(car) {
  const purchase = Number(car.purchasePrice || 0);
  const maintenance = (car.maintenance || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const warranty = (car.warranty || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return purchase + maintenance + warranty;
}

export function saleMargin(car) {
  if (car.salePrice == null || car.salePrice === '') return null;
  return Number(car.salePrice) - carCost(car);
}

export function buildFinance(cars, expenses) {
  const sold = cars.filter((car) => car.status === 'SOLD');
  const deposited = cars.filter((car) => car.status === 'DEPOSITED');
  const revenueSold = sold.reduce((sum, car) => sum + Number(car.salePrice || 0), 0);
  const revenueDeposit = deposited.reduce((sum, car) => sum + Number(car.deposit || 0), 0);
  const inflow = revenueSold + revenueDeposit;
  const costSold = sold.reduce((sum, car) => sum + carCost(car), 0);
  const opex = (expenses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const outflow = costSold + opex;
  const net = inflow - outflow;
  const stock = cars.filter((car) => car.status !== 'SOLD');
  const stockCapital = stock.reduce((sum, car) => sum + carCost(car), 0);
  return { sold, deposited, revenueSold, revenueDeposit, inflow, costSold, opex, outflow, net, loss: net < 0, stock, stockCapital };
}
