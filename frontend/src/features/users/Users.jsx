import { useState } from 'react';
import Modal from '../../components/Modal';
import ActionButton from '../../components/ActionButton';
import { makeId } from '../../lib/storage';
import { useBusy } from '../../lib/async';

export default function Users({ users, setUsers }) {
  const { busy, busyKey, run } = useBusy();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'EMPLOYEE', password: '123456' });
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const add = () => {
    if (!form.name || !form.email) {
      alert('Nhập tên và email');
      return;
    }
    if (users.some((person) => person.email === form.email)) {
      alert('Email đã tồn tại');
      return;
    }
    run('save-user', async () => {
      setUsers((prev) => [...prev, { ...form, id: makeId('u') }]);
      setOpen(false);
      setForm({ name: '', email: '', role: 'EMPLOYEE', password: '123456' });
    });
  };

  const remove = (id) => run(`delete-${id}`, async () => {
    setUsers((prev) => prev.filter((person) => person.id !== id));
  });

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">ACCESS CONTROL</div>
          <h2>Nhân sự & phân quyền</h2>
          <p>Quản lý tài khoản Admin và nhân viên garage.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>＋ Thêm nhân viên</button>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>NHÂN VIÊN</th><th>EMAIL ĐĂNG NHẬP</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((person) => (
                <tr key={person.id}>
                  <td><div className="person-cell"><div className="avatar avatar-light">{person.name[0]}</div><b>{person.name}</b></div></td>
                  <td>{person.email}</td>
                  <td><span className={`status ${person.role === 'ADMIN' ? 'status-deposited' : 'status-for_sale'}`}>{person.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE'}</span></td>
                  <td><span className="online-dot" /> Đang hoạt động</td>
                  <td>{person.role !== 'ADMIN' && <ActionButton className="btn btn-outline btn-sm" busy={busyKey === `delete-${person.id}`} disabled={busy} busyText="Đang xóa..." onClick={() => remove(person.id)}>Xóa</ActionButton>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {open && (
        <Modal title="Tạo tài khoản nhân viên" onClose={() => !busy && setOpen(false)}>
          <div className="field"><label>Họ và tên</label><input value={form.name} disabled={busy} onChange={set('name')} /></div>
          <div className="field"><label>Email</label><input type="email" value={form.email} disabled={busy} onChange={set('email')} /></div>
          <div className="field">
            <label>Vai trò</label>
            <select value={form.role} disabled={busy} onChange={set('role')}>
              <option value="EMPLOYEE">Nhân viên</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </div>
          <div className="field"><label>Mật khẩu demo</label><input value={form.password} disabled={busy} onChange={set('password')} /></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)} disabled={busy}>Hủy</button>
            <ActionButton busy={busyKey === 'save-user'} disabled={busy} onClick={add}>Tạo tài khoản</ActionButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
