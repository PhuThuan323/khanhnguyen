import { useCallback,useEffect,useRef,useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './features/dashboard/Dashboard';
import Inspection from './features/inspection/Inspection';
import Maintenance from './features/maintenance/Maintenance';
import Inventory from './features/inventory/Inventory';
import Sales from './features/sales/Sales';
import Expenses from './features/expenses/Expenses';
import Reports from './features/reports/Reports';
import Warranty from './features/warranty/Warranty';
import Users from './features/users/Users';
import { api,setToken,hasToken } from './lib/api';
import './App.css';
const adminPages=['dashboard','inventory','sales','expenses','reports','warranty','users'];
function Login({onLogin}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),button=useRef(null);
  const clientId=import.meta.env.VITE_GOOGLE_CLIENT_ID;
  useEffect(()=>{
    if(!clientId){setError('Thiếu VITE_GOOGLE_CLIENT_ID trong frontend/.env.');return;}
    let active=true;
    const mount=()=>{
      if(!active||!window.google?.accounts?.id||!button.current)return;
      window.google.accounts.id.initialize({client_id:clientId,callback:async({credential})=>{
        setBusy(true);setError('');try{
          const session=await api('/auth/google',{method:'POST',body:{credential}});
          setToken(session.token);onLogin(session.user);
        }catch(e){setError(e.message)}finally{setBusy(false)}
      }});
      button.current.innerHTML='';window.google.accounts.id.renderButton(button.current,{theme:'outline',size:'large',text:'signin_with',width:300});
    };
    if(window.google?.accounts?.id)mount();else{
      const id='google-identity-script';let script=document.getElementById(id);
      if(!script){script=document.createElement('script');script.id=id;script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;document.head.appendChild(script)}
      script.addEventListener('load',mount);
      script.addEventListener('error',()=>active&&setError('Không tải được Google Identity Services.'));
      return ()=>{active=false;script.removeEventListener('load',mount)};
    }
    return ()=>{active=false};
  },[clientId,onLogin]);
  return <div className="login-screen"><div className="login-art"><div className="login-brand"><div className="brand-mark">G</div><div><b>GARAGE OS</b><small>USED CAR MANAGEMENT</small></div></div><div className="login-copy"><div className="eyebrow">OPERATE SMARTER</div><h1>Quản lý garage.<br/>Tối ưu từng chiếc xe.</h1><p>Quản lý vòng đời xe cũ từ tiếp nhận, kiểm định, bảo dưỡng đến kinh doanh và hậu mãi.</p><div className="login-art-bottom">VEHICLE LIFECYCLE MANAGEMENT <span>© 2026 GARAGE OS</span></div></div></div>
    <div className="login-form-wrap"><div className="login-form"><div className="eyebrow">WELCOME BACK</div><h2>Đăng nhập hệ thống</h2><p>Đăng nhập bằng tài khoản Google đã được quản trị viên cấp quyền.</p><div ref={button} className="google-button"/>{busy&&<p>Đang xác minh tài khoản…</p>}{error&&<div className="error-text">{error}</div>}<div className="notice">Không dùng tài khoản mật khẩu demo. Tất cả nhân viên phải được Admin mời bằng email trước khi đăng nhập.</div></div></div></div>;
}
export default function App(){
  const [user,setUser]=useState(null),[loading,setLoading]=useState(hasToken()),[page,setPage]=useState('dashboard');
  const [cars,setCars]=useState([]),[users,setUsers]=useState([]),[expenses,setExpenses]=useState([]),[warranty,setWarranty]=useState([]),[error,setError]=useState(''),[refreshing,setRefreshing]=useState(false);
  const logout=useCallback(()=>{setToken('');setUser(null);setCars([]);setUsers([]);setExpenses([]);setWarranty([]);setPage('inspection')},[]);
  const login=useCallback((u)=>{setUser(u);setPage(u.role==='ADMIN'?'dashboard':'inspection')},[]);
  useEffect(()=>{
    const handle=()=>logout();window.addEventListener('garage-unauthorized',handle);
    if(hasToken())api('/auth/me').then(({user})=>login(user)).catch(e=>{setError(e.message);logout()}).finally(()=>setLoading(false));
    return ()=>window.removeEventListener('garage-unauthorized',handle);
  },[login,logout]);
  const onRefresh=useCallback(async()=>{
    if(!user)return;
    setRefreshing(true);
    try {
      const [nextCars,nextUsers,nextExpenses,nextWarranty]=await Promise.all([
        api('/cars'),
        user.role==='ADMIN'?api('/users'):Promise.resolve([]),
        user.role==='ADMIN'?api('/operations/expenses'):Promise.resolve([]),
        user.role==='ADMIN'?api('/operations/warranty'):Promise.resolve([])
      ]);
      setCars(nextCars);setUsers(nextUsers);setExpenses(nextExpenses);setWarranty(nextWarranty);setError('');
    }catch(e){setError(e.message)}finally{setRefreshing(false)}
  },[user]);
  useEffect(()=>{if(user)onRefresh()},[user,onRefresh]);
  useEffect(()=>{if(user&&adminPages.includes(page)&&user.role!=='ADMIN')setPage('inspection')},[user,page]);
  if(loading)return <div className="app-loading">Đang kiểm tra phiên đăng nhập…</div>;
  if(!user)return <Login onLogin={login}/>;
  const allowed=!adminPages.includes(page)||user.role==='ADMIN';
  return <div className="app-shell"><Sidebar page={page} setPage={setPage} user={user}/><div className="main-area"><Topbar user={user} onLogout={logout} page={page}/><main>
    {error&&<div className="app-error"><b>Lỗi kết nối hoặc tải dữ liệu:</b> {error} <button onClick={onRefresh} disabled={refreshing}>Thử lại</button></div>}
    {!allowed?<div className="empty">Bạn không có quyền truy cập.</div>:<>
      {page==='dashboard'&&<Dashboard cars={cars} expenses={expenses} warranty={warranty} setPage={setPage}/>}
      {page==='inspection'&&<Inspection cars={cars} onRefresh={onRefresh} user={user} users={users}/>}
      {page==='maintenance'&&<Maintenance cars={cars} onRefresh={onRefresh} user={user}/>}
      {page==='inventory'&&<Inventory cars={cars} onRefresh={onRefresh} user={user}/>}
      {page==='sales'&&<Sales cars={cars} onRefresh={onRefresh} user={user}/>}
      {page==='expenses'&&<Expenses expenses={expenses} onRefresh={onRefresh} user={user}/>}
      {page==='reports'&&<Reports/>}
      {page==='warranty'&&<Warranty cars={cars} warranty={warranty} onRefresh={onRefresh} user={user}/>}
      {page==='users'&&<Users users={users} user={user} onRefresh={onRefresh}/>}
    </>}
  </main></div></div>;
}
