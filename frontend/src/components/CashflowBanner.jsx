import { money } from '../lib/storage';
import { buildFinance } from '../lib/finance';

export default function CashflowBanner({ cars, expenses }) {
  const finance = buildFinance(cars, expenses);
  const tone = finance.net < 0 ? 'loss' : finance.net > 0 ? 'gain' : 'flat';
  const label = finance.net < 0 ? 'Lỗ tạm tính' : finance.net > 0 ? 'Dương tạm tính' : 'Hòa vốn';
  return (
    <section className={`cashflow-banner ${tone}`}>
      <div>
        <div className="eyebrow">{finance.net < 0 ? 'ĐANG LỖ' : 'DÒNG TIỀN'}</div>
        <h3>Dòng tiền tạm tính</h3>
        <p>Tiền bán xe đã bán + tiền cọc đã nhận − giá vốn xe đã bán − chi phí vận hành. Xe chưa bán chỉ nằm ở vốn tồn kho, chưa trừ vào dòng tiền.</p>
      </div>
      <div className="cashflow-figure">
        <strong className={finance.net < 0 ? 'money-loss' : finance.net > 0 ? 'money-gain' : ''}>{money(finance.net)}</strong>
        <small>{label} · Thu {money(finance.inflow)} · Chi {money(finance.outflow)}</small>
      </div>
    </section>
  );
}
