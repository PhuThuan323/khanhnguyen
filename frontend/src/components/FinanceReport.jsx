import { money, statusText } from '../lib/storage';
import { buildFinance, carCost, saleMargin } from '../lib/finance';

function longDate(date) {
  return `Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
}

export default function FinanceReport({ cars, expenses, user, onClose }) {
  const finance = buildFinance(cars, expenses);
  const now = new Date();
  const code = `BC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const priced = cars.filter((car) => car.salePrice != null && car.salePrice !== '');

  const printReport = () => window.print();

  return (
    <div className="report-backdrop">
      <div className="report-toolbar no-print">
        <div>
          <b>Xem trước báo cáo</b>
          <span>In ra giấy hoặc lưu PDF, chừa chỗ ký tên và đóng dấu.</span>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Đóng</button>
          <button type="button" className="btn btn-primary" onClick={printReport}>In / lưu PDF</button>
        </div>
      </div>
      <article className="print-root report-sheet" id="finance-report">
        <header className="report-head">
          <div>
            <strong>GARAGE OS</strong>
            <span>Hệ thống quản lý xe đã qua sử dụng</span>
          </div>
          <div className="report-meta">
            <span>Số: {code}</span>
            <span>Ngày lập: {now.toLocaleDateString('vi-VN')}</span>
          </div>
        </header>
        <h1>BÁO CÁO TÀI CHÍNH TẠM TÍNH</h1>
        <p className="report-sub">Kỳ đối chiếu: toàn bộ hồ sơ đang lưu trên hệ thống · Người lập: {user?.name || '—'}</p>

        <section className={`report-total ${finance.loss ? 'loss' : ''}`}>
          <div>
            <span>Dòng tiền tạm tính</span>
            <b className={finance.net < 0 ? 'money-loss' : 'money-gain'}>{money(finance.net)}</b>
            <small>{finance.loss ? 'Lỗ tạm tính' : 'Dương tạm tính'}</small>
          </div>
          <ul>
            <li><span>Thu từ xe đã bán</span><b>{money(finance.revenueSold)}</b></li>
            <li><span>Tiền cọc đã nhận</span><b>{money(finance.revenueDeposit)}</b></li>
            <li><span>Giá vốn xe đã bán</span><b>{money(finance.costSold)}</b></li>
            <li><span>Chi phí vận hành</span><b>{money(finance.opex)}</b></li>
          </ul>
        </section>

        <h2>1. Doanh thu và tiền cọc đã ghi nhận</h2>
        <table>
          <thead>
            <tr><th>Mã hồ sơ</th><th>Xe</th><th>Biển số</th><th>Trạng thái</th><th>Số tiền</th></tr>
          </thead>
          <tbody>
            {finance.sold.map((car) => (
              <tr key={car.id}><td>{car.id}</td><td>{car.brand} {car.model}</td><td>{car.plate}</td><td>Đã bán</td><td>{money(car.salePrice)}</td></tr>
            ))}
            {finance.deposited.map((car) => (
              <tr key={car.id}><td>{car.id}</td><td>{car.brand} {car.model}</td><td>{car.plate}</td><td>Đặt cọc</td><td>{money(car.deposit)}</td></tr>
            ))}
            {finance.sold.length + finance.deposited.length === 0 && <tr><td colSpan={5}>Chưa có xe bán hoặc đặt cọc.</td></tr>}
          </tbody>
        </table>

        <h2>2. Giá vốn xe đã bán</h2>
        <table>
          <thead>
            <tr><th>Mã hồ sơ</th><th>Xe</th><th>Giá thu mua</th><th>Bảo dưỡng</th><th>Bảo hành</th><th>Giá vốn</th></tr>
          </thead>
          <tbody>
            {finance.sold.length === 0 && <tr><td colSpan={6}>Chưa có xe đã bán. Giá vốn tồn kho được nêu riêng ở mục 5.</td></tr>}
            {finance.sold.map((car) => (
              <tr key={car.id}>
                <td>{car.id}</td>
                <td>{car.brand} {car.model}</td>
                <td>{money(car.purchasePrice)}</td>
                <td>{money((car.maintenance || []).reduce((sum, item) => sum + Number(item.amount || 0), 0))}</td>
                <td>{money((car.warranty || []).reduce((sum, item) => sum + Number(item.amount || 0), 0))}</td>
                <td>{money(carCost(car))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>3. Chi phí vận hành</h2>
        <table>
          <thead>
            <tr><th>Mã</th><th>Ngày</th><th>Hạng mục</th><th>Nội dung</th><th>Số tiền</th></tr>
          </thead>
          <tbody>
            {expenses.length === 0 && <tr><td colSpan={5}>Chưa ghi nhận chi phí vận hành.</td></tr>}
            {expenses.map((item) => (
              <tr key={item.id}><td>{item.id}</td><td>{item.date}</td><td>{item.category}</td><td>{item.description || '—'}</td><td>{money(item.amount)}</td></tr>
            ))}
            <tr className="report-sum"><td colSpan={4}>Tổng chi phí vận hành</td><td>{money(finance.opex)}</td></tr>
          </tbody>
        </table>

        <h2>4. Lãi lỗ tạm tính theo giá bán đã niêm yết</h2>
        <table>
          <thead>
            <tr><th>Mã hồ sơ</th><th>Xe</th><th>Giá bán</th><th>Giá vốn</th><th>Lãi / lỗ</th></tr>
          </thead>
          <tbody>
            {priced.length === 0 && <tr><td colSpan={5}>Chưa có xe được duyệt giá bán.</td></tr>}
            {priced.map((car) => {
              const margin = saleMargin(car);
              return (
                <tr key={car.id} className={margin < 0 ? 'report-loss' : ''}>
                  <td>{car.id}</td>
                  <td>{car.brand} {car.model}<br />{statusText[car.status]}</td>
                  <td>{money(car.salePrice)}</td>
                  <td>{money(carCost(car))}</td>
                  <td className={margin < 0 ? 'money-loss' : 'money-gain'}>{money(margin)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h2>5. Vốn tồn kho (không trừ vào dòng tiền tạm tính)</h2>
        <table>
          <thead>
            <tr><th>Mã hồ sơ</th><th>Xe</th><th>Biển số</th><th>Trạng thái</th><th>Giá vốn</th></tr>
          </thead>
          <tbody>
            {finance.stock.map((car) => (
              <tr key={car.id}><td>{car.id}</td><td>{car.brand} {car.model}</td><td>{car.plate}</td><td>{statusText[car.status]}</td><td>{money(carCost(car))}</td></tr>
            ))}
            <tr className="report-sum"><td colSpan={4}>Tổng vốn xe chưa bán</td><td>{money(finance.stockCapital)}</td></tr>
          </tbody>
        </table>

        <p className="report-note">
          Cách tính dòng tiền tạm tính: tiền bán các xe trạng thái Đã bán, cộng tiền cọc các xe Đã đặt cọc, trừ giá vốn (giá thu mua + bảo dưỡng + bảo hành) của xe đã bán, trừ toàn bộ chi phí vận hành.
          Số liệu dùng để đối chiếu nội bộ, chưa phải báo cáo thuế. Nếu kết quả âm, dòng tiền được ghi màu đỏ.
        </p>

        <footer className="report-sign">
          <p className="report-place">{longDate(now)}</p>
          <div className="sign-grid">
            <div>
              <b>Người lập biểu</b>
              <span>(Ký, ghi rõ họ tên)</span>
              <div className="sign-space" />
              <em>{user?.name || ''}</em>
            </div>
            <div>
              <b>Kế toán</b>
              <span>(Ký, ghi rõ họ tên)</span>
              <div className="sign-space" />
            </div>
            <div>
              <b>Giám đốc</b>
              <span>(Ký, ghi rõ họ tên, đóng dấu)</span>
              <div className="stamp-slot"><span>Đóng dấu</span></div>
            </div>
          </div>
          <p className="report-foot">Tài liệu nội bộ · Garage OS · {code}</p>
        </footer>
      </article>
    </div>
  );
}
