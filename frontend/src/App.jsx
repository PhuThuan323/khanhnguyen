import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './features/dashboard/Dashboard';
import Inspection from './features/inspection/Inspection';
import Maintenance from './features/maintenance/Maintenance';
import Inventory from './features/inventory/Inventory';
import Sales from './features/sales/Sales';
import Expenses from './features/expenses/Expenses';
import Warranty from './features/warranty/Warranty';
import Users from './features/users/Users';
import { loadState, saveState, readSession, writeSession, clearSession } from './lib/storage';
import './App.css';
import './polish.css';

const adminPages = ['dashboard', 'inventory', 'expenses', 'warranty', 'users'];

function Login({ onLogin, users, notice }) {
  const [email, setEmail] = useState('admin@garage.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState(notice || '');
  const [busy, setBusy] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
    if (!user) {
      setError('Email hoặc mật khẩu không chính xác.');
      setBusy(false);
      return;
    }
    onLogin(user);
  };
  return (
    <div className="login-screen">
      <div className="login-art">
        <div className="login-brand"><div className="brand-mark">G</div><div><b>GARAGE OS</b><small>USED CAR MANAGEMENT</small></div></div>
        <div className="login-copy">
          <div className="eyebrow">OPERATE SMARTER</div>
          <h1>Quản lý garage.<br />Tối ưu từng chiếc xe.</h1>
          <p>Một nền tảng quản lý toàn bộ vòng đời xe cũ — từ tiếp nhận, kiểm định, bảo dưỡng đến kinh doanh và hậu mãi.</p>
          <div className="login-art-bottom">VEHICLE LIFECYCLE MANAGEMENT <span>© 2026 GARAGE OS</span></div>
        </div>
      </div>
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="eyebrow">WELCOME BACK</div>
          <h2>Đăng nhập hệ thống</h2>
          <p>Phiên làm việc có hiệu lực 24 giờ.</p>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <div className="field"><label>Mật khẩu</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn-primary login-submit" disabled={busy}>{busy ? 'Đang đăng nhập...' : <>Đăng nhập <span>→</span></>}</button>
          <div className="demo-accounts">
            <b>TÀI KHOẢN DEMO</b>
            <div>
              <button type="button" onClick={() => { setEmail('admin@garage.local'); setPassword('admin123'); }}>Admin · admin@garage.local / admin123</button>
              <button type="button" onClick={() => { setEmail('an@garage.local'); setPassword('123456'); }}>Nhân viên · an@garage.local / 123456</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [boot] = useState(readSession);
  const [data, setData] = useState(loadState);
  const [user, setUser] = useState(boot.user);
  const [expiresAt, setExpiresAt] = useState(boot.expiresAt);
  const [sessionNote, setSessionNote] = useState(boot.expired ? 'Phiên đăng nhập đã hết hạn sau 1 ngày. Vui lòng đăng nhập lại.' : '');
  const [page, setPage] = useState('dashboard');

  useEffect(() => { saveState(data); }, [data]);
  useEffect(() => {
    if (user && adminPages.includes(page) && user.role !== 'ADMIN') setPage('inspection');
  }, [user, page]);
  useEffect(() => {
    if (!expiresAt) return undefined;
    const left = expiresAt - Date.now();
    if (left <= 0) {
      clearSession();
      setUser(null);
      setExpiresAt(null);
      setSessionNote('Phiên đăng nhập đã hết hạn sau 1 ngày. Vui lòng đăng nhập lại.');
      return undefined;
    }
    const timer = setTimeout(() => {
      clearSession();
      setUser(null);
      setExpiresAt(null);
      setSessionNote('Phiên đăng nhập đã hết hạn sau 1 ngày. Vui lòng đăng nhập lại.');
    }, left);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const patch = (key) => (fn) => setData((prev) => ({ ...prev, [key]: typeof fn === 'function' ? fn(prev[key]) : fn }));
  const removeCar = (id) => setData((prev) => ({
    ...prev,
    cars: prev.cars.filter((car) => car.id !== id),
    warranty: prev.warranty.filter((item) => item.carId !== id),
  }));
  const login = (next) => {
    const exp = writeSession(next);
    setUser(next);
    setExpiresAt(exp);
    setSessionNote('');
    setPage(next.role === 'ADMIN' ? 'dashboard' : 'inspection');
  };
  const logout = () => {
    setUser(null);
    setExpiresAt(null);
    clearSession();
  };

  if (!user) return <Login onLogin={login} users={data.users} notice={sessionNote} />;
  const allowed = adminPages.includes(page) ? user.role === 'ADMIN' : true;
  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} user={user} />
      <div className="main-area">
        <Topbar user={user} onLogout={logout} page={page} expiresAt={expiresAt} />
        <main>
          {!allowed ? <div className="empty">Bạn không có quyền truy cập chức năng này.</div> : <>
            {page === 'dashboard' && <Dashboard cars={data.cars} expenses={data.expenses} warranty={data.warranty} setPage={setPage} user={user} />}
            {page === 'inspection' && <Inspection cars={data.cars} setCars={patch('cars')} user={user} onDeleteCar={removeCar} />}
            {page === 'maintenance' && <Maintenance cars={data.cars} setCars={patch('cars')} users={data.users} user={user} onDeleteCar={removeCar} />}
            {page === 'inventory' && <Inventory cars={data.cars} setCars={patch('cars')} user={user} />}
            {page === 'sales' && <Sales cars={data.cars} setCars={patch('cars')} user={user} />}
            {page === 'expenses' && <Expenses expenses={data.expenses} setExpenses={patch('expenses')} cars={data.cars} user={user} />}
            {page === 'warranty' && <Warranty cars={data.cars} setCars={patch('cars')} warranty={data.warranty} setWarranty={patch('warranty')} user={user} />}
            {page === 'users' && <Users users={data.users} setUsers={patch('users')} />}
          </>}
        </main>
      </div>
    </div>
  );
}
