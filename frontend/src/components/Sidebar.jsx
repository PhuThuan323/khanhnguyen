const navigation = [
  {
    title: 'ĐIỀU HÀNH',
    items: [
      { id: 'dashboard', label: 'Tổng quan', icon: '▦', roles: ['ADMIN'] },
      { id: 'inspection', label: 'Kiểm định xe', icon: '⌕', roles: ['ADMIN', 'EMPLOYEE'] },
      { id: 'documents', label: 'Hồ sơ xe', icon: '▣', roles: ['ADMIN','EMPLOYEE'] },
      { id: 'maintenance', label: 'Bảo dưỡng', icon: '⚒', roles: ['ADMIN', 'EMPLOYEE'] },
      { id: 'inventory', label: 'Kho xe & định giá', icon: '▤', roles: ['ADMIN'] },
      { id: 'sales', label: 'Kinh doanh', icon: '♧', roles: ['ADMIN'] },
    ],
  },
  {
    title: 'TÀI CHÍNH',
    items: [
      { id: 'expenses', label: 'Chi phí vận hành', icon: '↗', roles: ['ADMIN', 'EMPLOYEE'] },
      { id: 'reports', label: 'Báo cáo tài chính', icon: '▥', roles: ['ADMIN'] },
      { id: 'warranty', label: 'Bảo hành & hậu mãi', icon: '◇', roles: ['ADMIN'] },
    ],
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { id: 'users', label: 'Nhân sự & phân quyền', icon: '♙', roles: ['ADMIN'] },
    ],
  },
];

export default function Sidebar({ page, setPage, user, open=false, onClose=()=>{} }) {
  const allowedGroups = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(user.role)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <><div className={`sidebar-scrim ${open ? "visible" : ""}`} onClick={onClose} aria-hidden="true"/><aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand brand-vucar"><button className="sidebar-close" aria-label="Đóng menu" onClick={onClose}>×</button>
        <div className="brand-mark">G</div>
        <div>
          <b>GARAGE OS</b>
          <small>QUẢN LÝ THU MUA XE CŨ</small>
        </div>
      </div>

      <div className="sidebar-workspace-card">
        <span className="sidebar-workspace-kicker">WORKSPACE</span>
        <strong>{user.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Nhân viên kiểm định'}</strong>
        <p>
          {user.role === 'ADMIN'
            ? 'Theo dõi toàn bộ vòng đời xe từ tiếp nhận đến bán hàng.'
            : 'Chỉ hiển thị các khu vực bạn được phép thao tác.'}
        </p>
      </div>

      {allowedGroups.map((group) => (
        <section className="nav-group" key={group.title}>
          <div className="nav-heading">{group.title}</div>
          {group.items.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => {setPage(item.id);onClose();}}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </section>
      ))}

      <div className="sidebar-bottom sidebar-bottom-vucar">
        <div className="online-dot" />
        Hệ thống đang hoạt động
        <small>{user.role === 'ADMIN' ? 'Toàn quyền quản trị' : 'Chế độ nhân viên đã giới hạn quyền'}</small>
      </div>
    </aside></>
  );
}
