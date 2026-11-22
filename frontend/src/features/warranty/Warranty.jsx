import { useState } from 'react';
import Modal from '../../components/Modal';
import ActionButton from '../../components/ActionButton';
import { money, makeId, today } from '../../lib/storage';
import { useBusy } from '../../lib/async';

export default function Warranty({ cars, setCars, warranty, setWarranty, user }) {
  const { busy, busyKey, run } = useBusy();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [historyCar, setHistoryCar] = useState(null);
  const [form, setForm] = useState({ carId: '', description: '', amount: '', date: today() });
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const add = () => {
    if (!form.carId || !form.description || !form.amount) {
      alert('Vui lòng nhập đủ thông tin');
      return;
    }
    run('save-warranty', async () => {
      const item = { ...form, id: makeId('WAR'), amount: Number(form.amount), status: 'COMPLETED', createdBy: user.id };
      setWarranty((prev) => [item, ...prev]);
      setCars((prev) => prev.map((car) => car.id === form.carId ? { ...car, warranty: [...car.warranty, item] } : car));
      setOpen(false);
      setForm({ carId: '', description: '', amount: '', date: today() });
    });
  };

  const total = warranty.reduce((sum, item) => sum + Number(item.amount), 0);
  const matches = cars.filter((car) => `${car.id} ${car.plate} ${car.brand} ${car.model}`.toLowerCase().includes(query.toLowerCase()));
  const capital = (car) => Number(car.purchasePrice || 0) + car.maintenance.reduce((sum, item) => sum + Number(item.amount || 0), 0) + car.warranty.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">AFTER-SALES & WARRANTY</div>
          <h2>Bảo hành & hậu mãi</h2>
          <p>Tra cứu theo mã hồ sơ xe và ghi nhận chi phí bảo hành sau bán.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>＋ Ghi nhận bảo hành</button>
      </div>
      <div className="panel history-search">
        <div className="panel-head"><div><h3>Tra cứu lịch sử xe</h3><p>Tìm theo mã hồ sơ, biển số hoặc tên dòng xe</p></div></div>
        <div className="history-search-body">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: CAR-2026-001 hoặc 51K-123.45" />
          <div className="history-results">
            {query && matches.slice(0, 5).map((car) => (
              <div className="history-result" key={car.id}>
                <div><b>{car.id}</b><small>{car.plate} · {car.brand} {car.model} · {car.year}</small></div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setHistoryCar(car)}>Xem lịch sử</button>
              </div>
            ))}
            {query && matches.length === 0 && <small>Không tìm thấy hồ sơ phù hợp.</small>}
          </div>
        </div>
      </div>
      <div className="stats-strip">
        <div><b>{warranty.length}</b><span>Hồ sơ hậu mãi</span></div>
        <div><b>{money(total)}</b><span>Tổng chi phí bảo hành</span></div>
        <div><b>{cars.filter((car) => car.status === 'SOLD').length}</b><span>Xe đã bán</span></div>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>MÃ HẬU MÃI</th><th>MÃ HỒ SƠ XE</th><th>BIỂN SỐ / XE</th><th>NỘI DUNG</th><th>NGÀY</th><th>CHI PHÍ</th></tr>
            </thead>
            <tbody>
              {warranty.map((item) => {
                const car = cars.find((entry) => entry.id === item.carId);
                return (
                  <tr key={item.id}>
                    <td><b>{item.id}</b></td>
                    <td>{item.carId}</td>
                    <td>{car ? `${car.plate} · ${car.brand} ${car.model}` : 'Không tìm thấy xe'}</td>
                    <td className="cell-wrap">{item.description}</td>
                    <td>{item.date}</td>
                    <td><b>{money(item.amount)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {warranty.length === 0 && <div className="empty">Chưa có hồ sơ bảo hành.</div>}
        </div>
      </div>
      {historyCar && (
        <Modal title={`Lịch sử xe · ${historyCar.id}`} subtitle={`${historyCar.plate} · ${historyCar.brand} ${historyCar.model}`} onClose={() => setHistoryCar(null)} wide>
          <div className="history-summary">
            <div><span>Giá thu mua</span><b>{money(historyCar.purchasePrice)}</b></div>
            <div><span>Bảo dưỡng</span><b>{money(historyCar.maintenance.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</b></div>
            <div><span>Bảo hành</span><b>{money(historyCar.warranty.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</b></div>
            <div><span>Tổng giá vốn</span><b>{money(capital(historyCar))}</b></div>
          </div>
          <h4>Lịch sử kiểm định</h4>
          <p className="history-line">{historyCar.inspection?.inspectedAt ? `Đã kiểm định ngày ${historyCar.inspection.inspectedAt}` : 'Chưa hoàn tất kiểm định'}</p>
          {Object.entries(historyCar.inspection?.checks || {}).map(([key, value]) => <p className="history-line" key={key}>{key}: <b>{value}</b></p>)}
          <h4>Lịch sử bảo dưỡng</h4>
          {historyCar.maintenance.length ? historyCar.maintenance.map((item) => (
            <div className="history-line" key={item.id}>
              <span>{item.date} · {item.task} · <b>{money(item.amount)}</b> {item.locked ? '· Đã chốt' : ''}</span>
              {item.note ? <span className="history-note">{item.note}</span> : null}
            </div>
          )) : <p className="history-line">Chưa có dữ liệu bảo dưỡng.</p>}
          <h4>Lịch sử khách hàng</h4>
          {historyCar.leads.length ? historyCar.leads.map((item) => (
            <p className="history-line" key={item.id}>{item.date} · {item.name} · {item.phone}{item.note ? ` · ${item.note}` : ''}</p>
          )) : <p className="history-line">Chưa có khách hàng quan tâm.</p>}
          <h4>Lịch sử bảo hành</h4>
          {historyCar.warranty.length ? historyCar.warranty.map((item) => (
            <p className="history-line" key={item.id}>{item.date} · {item.description} · <b>{money(item.amount)}</b></p>
          )) : <p className="history-line">Chưa phát sinh bảo hành.</p>}
          <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setHistoryCar(null)}>Đóng</button></div>
        </Modal>
      )}
      {open && (
        <Modal title="Ghi nhận chi phí bảo hành" subtitle="Chi phí được cộng vào tổng giá vốn vòng đời của xe" onClose={() => !busy && setOpen(false)}>
          <div className="field">
            <label>Tra cứu mã hồ sơ / xe</label>
            <select value={form.carId} disabled={busy} onChange={set('carId')}>
              <option value="">Chọn xe</option>
              {cars.map((car) => <option value={car.id} key={car.id}>{car.id} · {car.plate} · {car.brand} {car.model}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Nội dung bảo hành</label>
            <textarea value={form.description} disabled={busy} onChange={set('description')} />
          </div>
          <div className="field">
            <label>Chi phí (VNĐ)</label>
            <input type="number" value={form.amount} disabled={busy} onChange={set('amount')} />
          </div>
          <div className="field">
            <label>Ngày thực hiện</label>
            <input type="date" value={form.date} disabled={busy} onChange={set('date')} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)} disabled={busy}>Hủy</button>
            <ActionButton busy={busyKey === 'save-warranty'} disabled={busy} onClick={add}>Lưu hồ sơ</ActionButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
