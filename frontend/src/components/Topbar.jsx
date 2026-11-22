import Icon from './Icon';
const names={dashboard:'Tổng quan',inspection:'Kiểm định xe',documents:'Hồ sơ xe',maintenance:'Bảo dưỡng xe',inventory:'Kho xe & định giá',sales:'Kinh doanh & khách hàng',expenses:'Chi phí vận hành',reports:'Báo cáo tài chính',warranty:'Bảo hành & hậu mãi',users:'Nhân sự & phân quyền'};
export default function Topbar({user,onLogout,page,onMenu}){
  return <header className="topbar">
    <div className="topbar-left">
      <button type="button" className="mobile-menu" onClick={onMenu} aria-label="Mở thanh điều hướng"><Icon name="menu" size={20}/></button>
      <div className="topbar-heading"><div className="breadcrumb">Khánh Nguyên <span>/</span> Garage OS</div><h1>{names[page]||page}</h1></div>
    </div>
    <div className="top-actions">
      <div className="topbar-date">{new Date().toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'})}</div>
      <div className="user-chip"><div className="avatar" aria-hidden="true">{(user.name||'U').charAt(0).toUpperCase()}</div><div><b>{user.name||'Tài khoản'}</b><small>{user.role==='ADMIN'?'Quản trị viên':'Nhân viên'}</small></div></div>
      <button type="button" className="logout-btn" onClick={onLogout} title="Đăng xuất" aria-label="Đăng xuất"><Icon name="logout"/><span>Đăng xuất</span></button>
    </div>
  </header>;
}
