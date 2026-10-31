const groups = [
 { title:'TỔNG QUAN', items:[['dashboard','Tổng quan','◫']] },
 { title:'QUẢN LÝ XE', items:[['inspection','Kiểm định xe','⌕'],['maintenance','Bảo dưỡng','⚒'],['inventory','Kho xe & định giá','▤'],['sales','Kinh doanh & khách hàng','♧']] },
 { title:'TÀI CHÍNH', items:[['expenses','Chi phí vận hành','↗'],['warranty','Bảo hành & hậu mãi','◇']] },
 { title:'HỆ THỐNG', items:[['users','Nhân sự & phân quyền','♙']] },
];
export default function Sidebar({page,setPage,user}) { return <aside className="sidebar"><div className="brand"><div className="brand-mark">G</div><div><b>GARAGE OS</b><small>USED CAR MANAGEMENT</small></div></div><div className="side-label">WORKSPACE</div>{groups.map(g=><section className="nav-group" key={g.title}><div className="nav-heading">{g.title}</div>{g.items.filter(([id])=>id!=='dashboard'||user.role==='ADMIN').filter(([id])=>!['dashboard','inventory','expenses','warranty','users'].includes(id)||user.role==='ADMIN').map(([id,label,icon])=><button key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>setPage(id)}><span className="nav-icon">{icon}</span>{label}</button>)}</section>)}<div className="sidebar-bottom"><div className="online-dot"/> Hệ thống đang hoạt động <small>Local demo · v1.0.0</small></div></aside> }
