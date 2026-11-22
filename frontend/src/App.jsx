import {useQuery,useQueryClient} from '@tanstack/react-query';
import { useCallback,useEffect,useRef,useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Icon from './components/Icon';
import Dashboard from './features/dashboard/Dashboard';
import Inspection from './features/inspection/Inspection';
import Maintenance from './features/maintenance/Maintenance';
import Inventory from './features/inventory/Inventory';
import Sales from './features/sales/Sales';
import Expenses from './features/expenses/Expenses';
import Reports from './features/reports/Reports';
import Warranty from './features/warranty/Warranty';
import Users from './features/users/Users';
import Documents from './features/documents/Documents';
import { api,setToken,hasToken,getToken } from './lib/api';
import {startLiveSync} from './lib/live';
import './App.css';
import './yc05.css';
import './yc06-consistency.css';
import './unslop.css';
const adminPages=['dashboard','inventory','sales','reports','warranty','users'];
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
  return <div className="login-screen yc05-login">
    <section className="login-art">
      <div className="login-brand"><div className="brand-mark" aria-hidden="true">K</div><div><b>KHÁNH NGUYÊN</b><small>Garage OS</small></div></div>
      <div className="login-visual" aria-hidden="true"><svg className="login-car-svg" viewBox="0 0 680 260" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M48 171 L87 132 L171 112 L244 49 Q257 39 279 39 L428 39 Q466 39 497 64 L567 111 L618 129 Q640 138 649 164 L650 191 L604 194 Q601 153 566 153 Q528 153 520 197 L184 197 Q176 154 140 154 Q103 154 96 196 L47 194 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M235 112 L277 56 L431 56 Q456 56 479 78 L518 113 Z" stroke="currentColor" strokeWidth="2"/><path d="M369 57 L369 113 M195 128 L524 128 M240 138 L240 161" stroke="currentColor" strokeOpacity=".65" strokeWidth="2"/><circle cx="140" cy="198" r="42" stroke="currentColor" strokeWidth="4"/><circle cx="140" cy="198" r="21" stroke="currentColor" strokeWidth="2"/><circle cx="563" cy="198" r="42" stroke="currentColor" strokeWidth="4"/><circle cx="563" cy="198" r="21" stroke="currentColor" strokeWidth="2"/></svg></div>
      <div className="login-copy"><div className="login-kicker">Quản lý nội bộ showroom ô tô</div><h1>Quản lý xe rõ ràng,<br/>từ tiếp nhận đến bàn giao</h1><p>Theo dõi kiểm định, hồ sơ xe, kho hàng, giao dịch và chi phí trên cùng một hệ thống.</p></div>
      <div className="login-art-bottom"><span>Khánh Nguyên · Đồng Tháp</span><span>Garage OS</span></div>
    </section>
    <section className="login-form-wrap">
      <div className="login-form"><div className="login-form-icon" aria-hidden="true">K</div><div className="login-kicker">Tài khoản đã được cấp quyền</div><h2>Đăng nhập hệ thống</h2><p>Sử dụng tài khoản Google của bạn để truy cập dữ liệu và chức năng được phân quyền.</p><div ref={button} className="google-button" aria-label="Đăng nhập bằng Google"/>{busy&&<p role="status">Đang xác minh tài khoản…</p>}{error&&<div className="error-text" role="alert">{error}</div>}<div className="login-secure"><Icon name="warranty" size={17}/> Đăng nhập có xác thực và phân quyền</div><div className="notice">Chưa có quyền truy cập? Liên hệ quản trị viên để thêm tài khoản.</div></div>
      <div className="login-footer">Khánh Nguyên · Garage OS</div>
    </section>
  </div>;
}
export default function App(){
  const queryClient=useQueryClient();
    const [liveVersion,setLiveVersion]=useState(0);
  const [user,setUser]=useState(null),[loading,setLoading]=useState(hasToken()),[page,setPage]=useState('dashboard');
  const [error,setError]=useState(''),[refreshing,setRefreshing]=useState(false),[sidebarOpen,setSidebarOpen]=useState(false);
  const cache={cars:useQuery({queryKey:['garage','cars'],queryFn:()=>api('/cars?view=summary'),enabled:!!user,staleTime:45_000}),
    users:useQuery({queryKey:['garage','users'],queryFn:()=>api('/users'),enabled:!!user&&user.role==='ADMIN',staleTime:120_000}),
    expenses:useQuery({queryKey:['garage','expenses'],queryFn:()=>api('/operations/expenses'),enabled:!!user&&user.role==='ADMIN',staleTime:45_000}),
    warranty:useQuery({queryKey:['garage','warranty'],queryFn:()=>api('/operations/warranty'),enabled:!!user,staleTime:45_000})};
  const cars=cache.cars.data||[],users=cache.users.data||[],expenses=cache.expenses.data||[],warranty=cache.warranty.data||[];
  const logout=useCallback(()=>{setToken('');setUser(null);queryClient.removeQueries({queryKey:['garage']});setPage('inspection')},[queryClient]);
  const login=useCallback((u)=>{setUser(u);setPage(u.role==='ADMIN'?'dashboard':'inspection')},[]);
  useEffect(()=>{
    const handle=()=>logout();window.addEventListener('garage-unauthorized',handle);
    if(hasToken())api('/auth/me').then(({user})=>login(user)).catch(e=>{setError(e.message);logout()}).finally(()=>setLoading(false));
    return ()=>window.removeEventListener('garage-unauthorized',handle);
  },[login,logout]);
  const onRefresh=useCallback(async(scopes=['cars'])=>{
    if(!user)return;
    const target=[...new Set(Array.isArray(scopes)?scopes:['cars'])];
    setRefreshing(true);
    try{
      // Deduplicate concurrent loads, reuse cached queries and refetch only invalidated scopes.
      await Promise.all(target.filter(scope=>scope!=='users'||user.role==='ADMIN').filter(scope=>scope!=='warranty'||user.role==='ADMIN').map(async(scope)=>{
        await queryClient.invalidateQueries({queryKey:['garage',scope]});
      }));
      setError('');
    }catch(e){setError(e.message)}finally{setRefreshing(false)}
  },[user,queryClient]);
  useEffect(()=>{if(!user)return;
    const errors=[cache.cars,cache.users,cache.expenses,cache.warranty].filter(q=>q.isError).map(q=>q.error?.message).filter(Boolean);
    if(errors.length)setError(errors[0]);
  },[user,cache.cars.isError,cache.users.isError,cache.expenses.isError,cache.warranty.isError]);
  useEffect(()=>{
    if(!user)return;
    let timer=null;const pending=new Set();
    const flush=()=>{timer=null;const scopes=[...pending];pending.clear();if(scopes.length)onRefresh(scopes);setLiveVersion(v=>v+1)};
    const queue=event=>{
      const scope=event.scope==='warranty'?'warranty':event.scope==='expenses'?'expenses':event.scope==='users'?'users':'cars';
      // If a car identifier is available, update that one cached car from the detail API.
      // The fallback refresh still handles changes to list membership and derived reports.
      if(scope==='cars'&&event.carId){
        api(`/cars/${encodeURIComponent(event.carId)}`).then(car=>{
          queryClient.setQueryData(['garage','cars'],old=>{
            if(!old)return old;const index=old.findIndex(x=>x.id===car.id);
            const next={...car,hydrated:true};return index<0?[next,...old]:old.map(x=>x.id===next.id?next:x);
          });
        }).catch(()=>pending.add('cars'));
      }else pending.add(scope);
      if(scope==='cars'&&!event.carId)pending.add('cars');
      if(scope==='warranty')pending.add('cars');
      // Other aggregates have independent queries and must be invalidated.
      if(!timer)timer=setTimeout(flush,400);
    };
    const stop=startLiveSync(getToken,queue);
    const revalidate=()=>{if(!document.hidden)onRefresh(['cars','expenses','warranty'])};
    document.addEventListener('visibilitychange',revalidate);
    window.addEventListener('focus',revalidate);
    const interval=setInterval(()=>{if(!document.hidden)revalidate()},120000);
    return()=>{stop();clearInterval(interval);clearTimeout(timer);document.removeEventListener('visibilitychange',revalidate);window.removeEventListener('focus',revalidate)};
  },[user,onRefresh,queryClient]);
  useEffect(()=>{if(user&&adminPages.includes(page)&&user.role!=='ADMIN')setPage('inspection')},[user,page]);
  if(loading)return <div className="app-loading">Đang kiểm tra phiên đăng nhập…</div>;
  if(!user)return <Login onLogin={login}/>;
  const allowed=!adminPages.includes(page)||user.role==='ADMIN';
  return <div className="app-shell"><Sidebar page={page} setPage={setPage} user={user} open={sidebarOpen} onClose={()=>setSidebarOpen(false)}/><div className="main-area"><Topbar user={user} onLogout={logout} page={page} onMenu={()=>setSidebarOpen(true)} setPage={setPage}/><main>
    {error&&<div className="app-error"><b>Lỗi kết nối hoặc tải dữ liệu:</b> {error} <button onClick={()=>onRefresh(['cars','users','expenses','warranty'])} disabled={refreshing}>Thử lại</button></div>}
    {!allowed?<div className="empty">Bạn không có quyền truy cập.</div>:<>
      {page==='dashboard'&&<Dashboard cars={cars} expenses={expenses} warranty={warranty} setPage={setPage}/>}
      {page==='inspection'&&<Inspection cars={cars} onRefresh={onRefresh} user={user} users={users}/>}
      {page==='documents'&&<Documents user={user} onRefresh={onRefresh} reloadToken={cars}/>}
      {page==='maintenance'&&<Maintenance cars={cars} onRefresh={onRefresh} user={user}/>}
      {page==='inventory'&&<Inventory cars={cars} onRefresh={onRefresh} user={user}/>}
      {page==='sales'&&<Sales cars={cars} onRefresh={onRefresh} user={user} users={users}/>}
      {page==='expenses'&&<Expenses expenses={expenses} onRefresh={onRefresh} user={user} users={users}/>}
      {page==='reports'&&<Reports liveVersion={liveVersion}/>}
      {page==='warranty'&&<Warranty cars={cars} warranty={warranty} onRefresh={async()=>onRefresh(['warranty','cars'])} user={user}/>}
      {page==='users'&&<Users users={users} user={user} onRefresh={async()=>onRefresh(['users'])}/>}
    </>}
  </main></div></div>;
}
