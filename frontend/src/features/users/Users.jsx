import { useState } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../lib/api';
export default function Users({users,user,onRefresh}){
  const [open,setOpen]=useState(false),[f,setF]=useState({name:'',email:'',role:'EMPLOYEE'}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const invoke=async fn=>{setBusy(true);setError('');try{await fn();await onRefresh();}catch(e){setError(e.message)}finally{setBusy(false)}};
  const add=()=>invoke(async()=>{await api('/users',{method:'POST',body:f});setOpen(false);setF({name:'',email:'',role:'EMPLOYEE'})});
  const change=(u,update)=>invoke(async()=>{await api(`/users/${u.id}`,{method:'PATCH',body:update})});
  return <div className="page-content"><div className="page-toolbar"><div><div className="eyebrow">ACCESS CONTROL</div><h2>Nhân sự & phân quyền</h2><p>Admin mời nhân viên bằng email Google và phân công kiểm định theo xe.</p></div><button className="btn btn-primary" onClick={()=>setOpen(true)}>＋ Mời nhân viên</button></div>
    {error&&<div className="error-text">{error}</div>}
    <div className="panel"><div className="table-wrap"><table><thead><tr><th>NHÂN VIÊN</th><th>EMAIL GOOGLE</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>QUẢN LÝ</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><b>{u.name}</b></td><td>{u.email}</td><td><select disabled={busy||u.id===user.id} value={u.role} onChange={e=>change(u,{role:e.target.value})}><option value="EMPLOYEE">Nhân viên</option><option value="ADMIN">Admin</option></select></td><td>{u.active?'Đang hoạt động':'Đã khóa'}</td><td>{u.id!==user.id&&<button disabled={busy} className="btn btn-outline btn-sm" onClick={()=>change(u,{active:!u.active})}>{u.active?'Khóa tài khoản':'Mở tài khoản'}</button>}</td></tr>)}</tbody></table></div></div>
    {open&&<Modal title="Mời tài khoản Google" onClose={()=>setOpen(false)}><p>Nhân viên sẽ đăng nhập bằng đúng địa chỉ Gmail / Google Workspace được mời.</p><div className="field"><label>Họ và tên</label><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))}/></div><div className="field"><label>Email Google</label><input type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))}/></div><div className="field"><label>Vai trò</label><select value={f.role} onChange={e=>setF(p=>({...p,role:e.target.value}))}><option value="EMPLOYEE">Nhân viên</option><option value="ADMIN">Admin</option></select></div>{error&&<div className="error-text">{error}</div>}<div className="modal-actions"><button className="btn btn-outline" onClick={()=>setOpen(false)}>Hủy</button><button disabled={busy} className="btn btn-primary" onClick={add}>Cấp quyền đăng nhập</button></div></Modal>}
  </div>;
}
