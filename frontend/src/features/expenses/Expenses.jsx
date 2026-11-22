import { useState } from 'react';
import Modal from '../../components/Modal';
import ActionButton from '../../components/ActionButton';
import CashflowBanner from '../../components/CashflowBanner';
import FinanceReport from '../../components/FinanceReport';
import { money, makeId, today } from '../../lib/storage';
import { useBusy } from '../../lib/async';

const categories = ['Xăng dầu', 'Ăn uống nhân viên', 'Chi phí đi thu mua xe', 'Vận hành garage', 'Điện nước', 'Internet', 'Vật tư & dụng cụ', 'Khác'];

export default function Expenses({ expenses, setExpenses, cars, user }) {
  const { busy, busyKey, run } = useBusy();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
  const [form, setForm] = useState({ category: categories[0], amount: '', description: '', date: today() });
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const add = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Nhập số tiền hợp lệ');
      return;
    }
    run('save-expense', async () => {
      setExpenses((prev) => [{ ...form, id: makeId('EXP'), amount: Number(form.amount), createdBy: user.id }, ...prev]);
      setOpen(false);
      setForm({ category: categories[0], amount: '', description: '', date: today() });
    });
  };

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">OPERATING CASH FLOW</div>
          <h2>Chi phí vận hành</h2>
          <p>Ghi nhận chi phí phát sinh khi thu mua xe và vận hành garage.</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-outline" onClick={() => setReport(true)}>Xuất báo cáo tài chính</button>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>＋ Thêm chi phí</button>
        </div>
      </div>
      <CashflowBanner cars={cars} expenses={expenses} />
      <div className="stats-strip">
        <div><b>{money(expenses.reduce((sum, item) => sum + Number(item.amount), 0))}</b><span>Tổng chi phí ghi nhận</span></div>
        <div><b>{expenses.length}</b><span>Số khoản chi</span></div>
        <div><b>{money(expenses.filter((item) => item.category === 'Vận hành garage' || item.category === 'Điện nước' || item.category === 'Internet').reduce((sum, item) => sum + Number(item.amount), 0))}</b><span>Chi phí garage</span></div>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>MÃ CHI PHÍ</th><th>NGÀY</th><th>HẠNG MỤC</th><th>NỘI DUNG</th><th>NGƯỜI GHI NHẬN</th><th>SỐ TIỀN</th></tr>
            </thead>
            <tbody>
              {expenses.map((item) => (
                <tr key={item.id}>
                  <td><b>{item.id}</b></td>
                  <td>{item.date}</td>
                  <td><span className="category-pill">{item.category}</span></td>
                  <td className="cell-wrap">{item.description || '—'}</td>
                  <td>{user.id === item.createdBy ? 'Bạn' : item.createdBy}</td>
                  <td><b>{money(item.amount)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && <div className="empty">Chưa có chi phí nào.</div>}
        </div>
      </div>
      {open && (
        <Modal title="Ghi nhận chi phí mới" subtitle="Các khoản chi vận hành không gắn riêng với một xe" onClose={() => !busy && setOpen(false)}>
          <div className="field">
            <label>Hạng mục</label>
            <select value={form.category} disabled={busy} onChange={set('category')}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="field">
            <label>Số tiền (VNĐ)</label>
            <input type="number" value={form.amount} disabled={busy} onChange={set('amount')} />
          </div>
          <div className="field">
            <label>Ngày phát sinh</label>
            <input type="date" value={form.date} disabled={busy} onChange={set('date')} />
          </div>
          <div className="field">
            <label>Nội dung chi tiết</label>
            <textarea value={form.description} disabled={busy} onChange={set('description')} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)} disabled={busy}>Hủy</button>
            <ActionButton busy={busyKey === 'save-expense'} disabled={busy} onClick={add}>Lưu chi phí</ActionButton>
          </div>
        </Modal>
      )}
      {report && <FinanceReport cars={cars} expenses={expenses} user={user} onClose={() => setReport(false)} />}
    </div>
  );
}
