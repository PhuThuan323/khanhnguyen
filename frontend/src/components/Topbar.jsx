import { useEffect, useState } from 'react';

const names = {
  dashboard: 'Tổng quan',
  inspection: 'Kiểm định xe',
  maintenance: 'Bảo dưỡng xe',
  inventory: 'Kho xe & định giá',
  sales: 'Kinh doanh & khách hàng',
  expenses: 'Chi phí vận hành',
  warranty: 'Bảo hành & hậu mãi',
  users: 'Nhân sự & phân quyền',
};

function remainingLabel(expiresAt, now) {
  if (!expiresAt) return 'Phiên 24 giờ';
  const minutes = Math.floor((expiresAt - now) / 60000);
  if (minutes <= 0) return 'Phiên đã hết hạn';
  const hours = Math.floor(minutes / 60);
  if (hours >= 1) return `Phiên còn ${hours} giờ ${minutes % 60} phút`;
  return `Phiên còn ${Math.max(minutes, 1)} phút`;
}

export default function Topbar({ user, onLogout, page, expiresAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    : '';

  return (
    <header className="topbar">
      <div>
        <div className="breadcrumb">GARAGE OS <span>/</span> <b>{names[page]}</b></div>
        <h1>{names[page]}</h1>
      </div>
      <div className="top-actions">
        <div className="today-chip">◷ &nbsp; {new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</div>
        <div className="user-chip">
          <div className="avatar">{user.name?.charAt(0) || 'U'}</div>
          <div>
            <b>{user.name}</b>
            <small>{user.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}</small>
            <small className="session-left" title={expiry ? `Hết hạn ${expiry}` : ''}>{remainingLabel(expiresAt, now)}</small>
          </div>
        </div>
        <button type="button" className="logout-btn" onClick={onLogout}>Đăng xuất ↗</button>
      </div>
    </header>
  );
}
