import Icon from './Icon';

const navigation = [
  { title: 'Điều hành', items: [
    { id: 'dashboard', label: 'Tổng quan', icon: 'dashboard', roles: ['ADMIN'] },
    { id: 'inspection', label: 'Kiểm định xe', icon: 'inspection', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'documents', label: 'Hồ sơ xe', icon: 'document', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'maintenance', label: 'Bảo dưỡng', icon: 'wrench', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'inventory', label: 'Kho xe & định giá', icon: 'car', roles: ['ADMIN'] },
    { id: 'sales', label: 'Kinh doanh', icon: 'sales', roles: ['ADMIN'] },
  ]},
  { title: 'Tài chính', items: [
    { id: 'expenses', label: 'Chi phí vận hành', icon: 'expenses', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'reports', label: 'Báo cáo tài chính', icon: 'reports', roles: ['ADMIN'] },
    { id: 'warranty', label: 'Bảo hành & hậu mãi', icon: 'warranty', roles: ['ADMIN'] },
  ]},
  { title: 'Hệ thống', items: [
    { id: 'users', label: 'Nhân sự & phân quyền', icon: 'users', roles: ['ADMIN'] },
  ]},
];
export default function Sidebar({page,setPage,user,open=false,onClose=()=>{}}){
  const groups=navigation.map(group=>({...group,items:group.items.filter(item=>item.roles.includes(user.role))})).filter(group=>group.items.length);
  return <>
    {open&&<button type="button" className="sidebar-scrim visible" onClick={onClose} aria-label="Đóng thanh điều hướng"/>}
    <aside className={`sidebar ${open?'sidebar-open':''}`} aria-label="Thanh điều hướng">
      <div className="brand brand-vucar">
        <div className="brand-mark" aria-hidden="true">K</div>
        <div className="brand-copy"><b>KHÁNH NGUYÊN</b><small>Garage OS</small></div>
        <button className="sidebar-close" type="button" onClick={onClose} aria-label="Đóng menu"><Icon name="close"/></button>
      </div>
      <div className="sidebar-workspace-card">
        <span className="sidebar-workspace-kicker">Không gian làm việc</span>
        <strong>{user.role==='ADMIN'?'Quản lý showroom':'Kiểm định & hồ sơ'}</strong>
        <p>{user.role==='ADMIN'?'Thu mua · Kho xe · Kinh doanh':'Các khu vực được phân quyền'}</p>
      </div>
      <nav className="sidebar-nav" aria-label="Chức năng quản lý">
        {groups.map(group=><section className="nav-group" key={group.title}>
          <h2 className="nav-heading">{group.title}</h2>
          {group.items.map(item=><button
            key={item.id} type="button" aria-current={page===item.id?'page':undefined}
            className={`nav-item ${page===item.id?'active':''}`}
            onClick={()=>{setPage(item.id);onClose();}}>
            <span className="nav-icon"><Icon name={item.icon}/></span><span>{item.label}</span>
          </button>)}
        </section>)}
      </nav>
      <div className="sidebar-bottom sidebar-bottom-vucar"><span className="online-dot" aria-hidden="true"/><span>Phiên làm việc đang mở</span><small>{user.role==='ADMIN'?'Quyền quản trị':'Quyền nhân viên'}</small></div>
    </aside>
  </>;
}
