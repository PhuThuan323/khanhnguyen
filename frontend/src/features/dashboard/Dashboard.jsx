import { money, statusText } from "../../lib/storage";
export default function Dashboard({ cars, expenses, warranty, setPage }) {
  const total = cars.length,
    capital =
      cars.reduce(
        (s, c) =>
          s +
          Number(c.purchasePrice || 0) +
          c.maintenance.reduce((a, m) => a + Number(m.amount || 0), 0),
        0,
      ) + warranty.reduce((a, w) => a + Number(w.amount || 0), 0),
    forSale = cars.filter((c) => c.status === "FOR_SALE"),
    deposits = cars.filter((c) => c.status === "DEPOSITED");
  const stats = [
    ["Tổng số xe", total, "Hồ sơ xe trong hệ thống", "▣"],
    ["Đang kinh doanh", forSale.length, "Xe đã được duyệt bán", "↗"],
    ["Đã đặt cọc", deposits.length, "Chờ hoàn tất giao dịch", "◈"],
    ["Tổng vốn xe", money(capital), "Giá mua + bảo dưỡng + hậu mãi", "₫"],
  ];
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">GARAGE OVERVIEW</div>
          <h2>Xin chào, chào mừng trở lại 👋</h2>
          <p>
            Theo dõi tình hình vận hành và hiệu quả kinh doanh garage của bạn.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setPage("inspection")}
        >
          ＋ Tiếp nhận xe mới
        </button>
      </div>
      <div className="stats-grid">
        {stats.map(([label, value, sub, icon]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <i>{icon}</i>
            </div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Danh sách xe gần đây</h3>
              <p>Theo dõi trạng thái xử lý của từng hồ sơ</p>
            </div>
            <button className="text-btn" onClick={() => setPage("inventory")}>
              Xem tất cả →
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MÃ HỒ SƠ / BIỂN SỐ</th>
                  <th>THÔNG TIN XE</th>
                  <th>GIÁ THU MUA</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {cars.slice(0, 5).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>{c.id}</b>
                      <small>{c.plate}</small>
                    </td>
                    <td>
                      {c.brand} {c.model}
                      <small>
                        {c.year} · {c.odo?.toLocaleString("vi-VN")} km
                      </small>
                    </td>
                    <td>{money(c.purchasePrice)}</td>
                    <td>
                      <span
                        className={`status status-${c.status.toLowerCase()}`}
                      >
                        {statusText[c.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-head">
            <div>
              <h3>Tổng quan vận hành</h3>
              <p>Các chỉ số cần chú ý</p>
            </div>
          </div>
          <div className="quick-row">
            <div className="quick-icon orange">⚒</div>
            <div>
              <b>
                {cars.filter((c) => c.status === "MAINTENANCE").length} xe đang
                bảo dưỡng
              </b>
              <small>Cần theo dõi tiến độ sửa chữa</small>
            </div>
            <button onClick={() => setPage("maintenance")}>→</button>
          </div>
          <div className="quick-row">
            <div className="quick-icon blue">♧</div>
            <div>
              <b>
                {cars.reduce((s, c) => s + c.leads.length, 0)} khách hàng tiềm
                năng
              </b>
              <small>Thông tin khách quan tâm xe</small>
            </div>
            <button onClick={() => setPage("sales")}>→</button>
          </div>
          <div className="quick-row">
            <div className="quick-icon green">₫</div>
            <div>
              <b>{money(expenses.reduce((s, e) => s + Number(e.amount), 0))}</b>
              <small>Tổng chi phí vận hành đã ghi nhận</small>
            </div>
            <button onClick={() => setPage("expenses")}>→</button>
          </div>
          <div className="quick-row">
            <div className="quick-icon purple">◇</div>
            <div>
              <b>{warranty.length} hồ sơ hậu mãi</b>
              <small>Chi phí bảo hành được ghi nhận</small>
            </div>
            <button onClick={() => setPage("warranty")}>→</button>
          </div>
        </section>
      </div>
      <div className="notice"><b>ⓘ Dữ liệu hệ thống</b><span>Danh sách xe và chi phí được tải từ backend PostgreSQL, ảnh và hóa đơn lưu trên Cloudinary.</span></div>
    </div>
  );
}
