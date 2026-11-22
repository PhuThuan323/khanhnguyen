import { useState } from 'react';
import Modal from '../../components/Modal';
import ActionButton from '../../components/ActionButton';
import Fireworks from '../../components/Fireworks';
import { money, makeId, today, statusText } from '../../lib/storage';
import { saleMargin } from '../../lib/finance';
import { useBusy } from '../../lib/async';

const emptyLead = { name: '', tiktok: '', phone: '', address: '', note: '' };

export default function Sales({ cars, setCars, user }) {
  const { busy, busyKey, run } = useBusy();
  const [selected, setSelected] = useState(null);
  const [modalMode, setModalMode] = useState('lead');
  const [lead, setLead] = useState(emptyLead);
  const [deposit, setDeposit] = useState('');
  const [celebrate, setCelebrate] = useState(null);
  const list = cars.filter((car) => ['FOR_SALE', 'CUSTOMER_CLOSED', 'DEPOSITED', 'SOLD'].includes(car.status));
  const setField = (key) => (event) => setLead((prev) => ({ ...prev, [key]: event.target.value }));

  const saveLead = () => {
    if (!lead.name || !lead.phone) {
      alert('Nhập tên và số điện thoại khách');
      return;
    }
    run('save-lead', async () => {
      setCars((prev) => prev.map((car) => car.id === selected.id ? {
        ...car,
        leads: [...car.leads, { ...lead, id: makeId('CUS'), createdBy: user.id, date: today(), status: 'CONTACTED' }],
      } : car));
      setSelected(null);
      setLead(emptyLead);
    });
  };

  const markClosed = (car) => run(`close-${car.id}`, async () => {
    setCars((prev) => prev.map((item) => item.id === car.id ? { ...item, status: 'CUSTOMER_CLOSED' } : item));
  });

  const confirmDeposit = () => {
    if (!deposit || Number(deposit) <= 0) {
      alert('Nhập số tiền cọc');
      return;
    }
    run('save-deposit', async () => {
      setCars((prev) => prev.map((car) => car.id === selected.id ? {
        ...car,
        status: 'DEPOSITED',
        deposit: Number(deposit),
        depositConfirmedBy: user.id,
        depositDate: today(),
      } : car));
      setSelected(null);
    });
  };

  const confirmSold = (car) => run(`sold-${car.id}`, async () => {
    setCars((prev) => prev.map((item) => item.id === car.id ? { ...item, status: 'SOLD', soldDate: today() } : item));
    setCelebrate(car);
  });

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">SALES PIPELINE</div>
          <h2>Kinh doanh & khách hàng</h2>
          <p>Quản lý khách quan tâm, lịch sử tư vấn và xác nhận đặt cọc.</p>
        </div>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>XE ĐANG BÁN</th><th>GIÁ NIÊM YẾT</th><th>LÃI / LỖ TẠM TÍNH</th><th>KHÁCH QUAN TÂM</th><th>TIẾN ĐỘ</th><th>THAO TÁC</th></tr>
            </thead>
            <tbody>
              {list.map((car) => {
                const margin = saleMargin(car);
                return (
                  <tr key={car.id}>
                    <td><b>{car.brand} {car.model}</b><small>{car.plate} · {car.id}</small></td>
                    <td><b>{money(car.salePrice)}</b></td>
                    <td className={margin != null && margin < 0 ? 'money-loss' : margin > 0 ? 'money-gain' : ''}>{margin == null ? '—' : money(margin)}</td>
                    <td>{car.leads.length} khách<small>{car.leads.at(-1)?.name || 'Chưa có khách'}</small></td>
                    <td><span className={`status status-${car.status.toLowerCase()}`}>{statusText[car.status]}</span></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => { setSelected(car); setModalMode('lead'); setLead(emptyLead); }}>＋ Khách hàng</button>
                        {user.role === 'ADMIN' && car.status === 'CUSTOMER_CLOSED' && (
                          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => { setSelected(car); setModalMode('deposit'); setDeposit(''); }}>Xác nhận cọc</button>
                        )}
                        {car.status === 'FOR_SALE' && <ActionButton className="btn btn-outline btn-sm" busy={busyKey === `close-${car.id}`} disabled={busy} busyText="Đang lưu..." onClick={() => markClosed(car)}>Khách đã chốt</ActionButton>}
                        {user.role === 'ADMIN' && car.status === 'DEPOSITED' && (
                          <ActionButton className="btn btn-primary btn-sm" busy={busyKey === `sold-${car.id}`} disabled={busy} busyText="Đang lưu..." onClick={() => confirmSold(car)}>Xác nhận đã bán</ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <div className="empty">Chưa có xe được duyệt bán.</div>}
        </div>
      </div>
      {selected && (
        <Modal
          title={modalMode === 'deposit' ? 'Xác nhận tiền đặt cọc' : `Khách hàng quan tâm · ${selected.plate}`}
          subtitle={selected.id}
          onClose={() => !busy && setSelected(null)}
        >
          {modalMode === 'deposit' ? (
            <>
              <div className="field">
                <label>Số tiền khách đặt cọc (VNĐ)</label>
                <input type="number" value={deposit} disabled={busy} onChange={(event) => setDeposit(event.target.value)} />
              </div>
              <div className="notice">Thao tác này dành riêng cho Admin. Xe sẽ chuyển sang trạng thái Đã đặt cọc.</div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setSelected(null)} disabled={busy}>Hủy</button>
                <ActionButton busy={busyKey === 'save-deposit'} disabled={busy} onClick={confirmDeposit}>Xác nhận đặt cọc</ActionButton>
              </div>
            </>
          ) : (
            <>
              <div className="field"><label>Tên khách hàng *</label><input value={lead.name} disabled={busy} onChange={setField('name')} /></div>
              <div className="field"><label>Tài khoản TikTok</label><input value={lead.tiktok} disabled={busy} onChange={setField('tiktok')} placeholder="@username" /></div>
              <div className="field"><label>Số điện thoại *</label><input value={lead.phone} disabled={busy} onChange={setField('phone')} /></div>
              <div className="field"><label>Địa chỉ khách hàng</label><input value={lead.address} disabled={busy} onChange={setField('address')} /></div>
              <div className="field"><label>Lịch sử trao đổi / ghi chú</label><textarea value={lead.note} disabled={busy} onChange={setField('note')} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setSelected(null)} disabled={busy}>Hủy</button>
                <ActionButton busy={busyKey === 'save-lead'} disabled={busy} onClick={saveLead}>Lưu khách hàng</ActionButton>
              </div>
            </>
          )}
        </Modal>
      )}
      {celebrate && (
        <Fireworks
          title="Đã bán được xe"
          subtitle={`${celebrate.brand} ${celebrate.model} · ${celebrate.plate} vừa được chốt bán.`}
          onDone={() => setCelebrate(null)}
        />
      )}
    </div>
  );
}
