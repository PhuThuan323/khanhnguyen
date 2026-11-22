import { useState } from 'react';
import { money, statusText } from '../../lib/storage';
import CashflowBanner from '../../components/CashflowBanner';
import FinanceReport from '../../components/FinanceReport';

export default function Dashboard({ cars, expenses, warranty, setPage, user }) {
  const [report, setReport] = useState(false);
  const total = cars.length;
  const capital = cars.reduce((sum, car) => sum + Number(car.purchasePrice || 0) + car.maintenance.reduce((acc, item) => acc + Number(item.amount || 0), 0), 0) + warranty.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const forSale = cars.filter((car) => car.status === 'FOR_SALE');
  const deposits = cars.filter((car) => car.status === 'DEPOSITED');
  const period = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const stats = [
    ['Tổng số xe', total, 'Hồ sơ xe trong hệ thống', '▣'],
    ['Đang kinh doanh', forSale.length, 'Xe đã được duyệt bán', '↗'],
    ['Đã đặt cọc', deposits.length, 'Chờ hoàn tất giao dịch', '◈'],
    ['Tổng vốn xe', money(capital), 'Giá mua + bảo dưỡng + hậu mãi', '₫'],
  ];

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">GARAGE OVERVIEW / {period}</div>
          <h2>Xin chào, {user?.name || 'bạn'}.</h2>
          <p>Theo dõi tình hình vận hành và hiệu quả kinh doanh garage của bạn.</p>
        </div>
        <div className="toolbar-actions">
          {user?.role === 'ADMIN' && <button type="button" className="btn btn-outline" onClick={() => setReport(true)}>Xuất báo cáo tài chính</button>}
          <button type="button" className="btn btn-primary" onClick={() => setPage('inspection')}>＋ Tiếp nhận xe mới</button>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map(([label, value, sub, icon]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top"><span>{label}</span><i>{icon}</i></div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      <CashflowBanner cars={cars} expenses={expenses} />
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Danh sách xe gần đây</h3>
              <p>Theo dõi trạng thái xử lý của từng hồ sơ</p>
            </div>
            <button type="button" className="text-btn" onClick={() => setPage('inventory')}>Xem tất cả →</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>MÃ HỒ SƠ / BIỂN SỐ</th><th>THÔNG TIN XE</th><th>GIÁ THU MUA</th><th>TRẠNG THÁI</th></tr>
              </thead>
              <tbody>
                {cars.slice(0, 5).map((car) => (
                  <tr key={car.id}>
                    <td><b>{car.id}</b><small>{car.plate}</small></td>
                    <td>{car.brand} {car.model}<small>{car.year} · {car.odo?.toLocaleString('vi-VN')} km</small></td>
                    <td>{money(car.purchasePrice)}</td>
                    <td><span className={`status status-${car.status.toLowerCase()}`}>{statusText[car.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-head"><div><h3>Tổng quan vận hành</h3><p>Các chỉ số cần chú ý</p></div></div>
          <Quick icon="orange" title={`${cars.filter((car) => car.status === 'MAINTENANCE').length} xe đang bảo dưỡng`} text="Cần theo dõi tiến độ sửa chữa" onClick={() => setPage('maintenance')} />
          <Quick icon="blue" title={`${cars.reduce((sum, car) => sum + car.leads.length, 0)} khách hàng tiềm năng`} text="Thông tin khách quan tâm xe" onClick={() => setPage('sales')} />
          <Quick icon="green" title={money(expenses.reduce((sum, item) => sum + Number(item.amount), 0))} text="Tổng chi phí vận hành đã ghi nhận" onClick={() => setPage('expenses')} />
          <Quick icon="purple" title={`${warranty.length} hồ sơ hậu mãi`} text="Chi phí bảo hành được ghi nhận" onClick={() => setPage('warranty')} />
        </section>
      </div>
      <div className="notice">
        <b>Lưu ý về dữ liệu demo. </b>
        <span>Dữ liệu hiện được lưu trên trình duyệt bằng LocalStorage. Đây là bản chạy thử nghiệp vụ; chưa kết nối Zalo OA, TikTok API hoặc cơ sở dữ liệu dùng chung.</span>
      </div>
      {report && <FinanceReport cars={cars} expenses={expenses} user={user} onClose={() => setReport(false)} />}
    </div>
  );
}

function Quick({ icon, title, text, onClick }) {
  return (
    <div className="quick-row">
      <div className={`quick-icon ${icon}`}>{icon === 'orange' ? '⚒' : icon === 'blue' ? '♧' : icon === 'green' ? '₫' : '◇'}</div>
      <div><b>{title}</b><small>{text}</small></div>
      <button type="button" onClick={onClick}>→</button>
    </div>
  );
}
