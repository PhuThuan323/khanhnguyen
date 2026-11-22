import { useState } from 'react';
import Modal from '../../components/Modal';
import ActionButton from '../../components/ActionButton';
import { money, statusText } from '../../lib/storage';
import { carCost, saleMargin } from '../../lib/finance';
import { useBusy } from '../../lib/async';

export default function Inventory({ cars, setCars, user }) {
  const { busy, busyKey, run } = useBusy();
  const [selected, setSelected] = useState(null);
  const [price, setPrice] = useState('');
  const ready = cars.filter((car) => ['READY_FOR_REVIEW', 'FOR_SALE', 'CUSTOMER_CLOSED', 'DEPOSITED', 'SOLD'].includes(car.status));
  const preview = selected && price ? Number(price) - carCost(selected) : null;

  const approve = () => {
    if (!price || Number(price) <= 0) {
      alert('Nhập giá bán dự kiến');
      return;
    }
    run('approve-price', async () => {
      setCars((prev) => prev.map((car) => car.id === selected.id ? { ...car, salePrice: Number(price), status: 'FOR_SALE' } : car));
      setSelected(null);
    });
  };

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">INVENTORY & PRICING</div>
          <h2>Kho xe & định giá bán</h2>
          <p>Admin duyệt giá bán sau khi hoàn tất kiểm định và bảo dưỡng.</p>
        </div>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>XE / MÃ HỒ SƠ</th><th>GIÁ THU MUA</th><th>PHÍ BẢO DƯỠNG</th><th>GIÁ VỐN TẠM TÍNH</th><th>GIÁ BÁN</th><th>LÃI / LỖ TẠM TÍNH</th><th>TRẠNG THÁI</th><th></th></tr>
            </thead>
            <tbody>
              {ready.map((car) => {
                const margin = saleMargin(car);
                return (
                  <tr key={car.id}>
                    <td><b>{car.brand} {car.model}</b><small>{car.plate} · {car.id}</small></td>
                    <td>{money(car.purchasePrice)}</td>
                    <td>{money(car.maintenance.reduce((sum, item) => sum + Number(item.amount), 0))}</td>
                    <td><b>{money(carCost(car))}</b></td>
                    <td>{car.salePrice ? money(car.salePrice) : '—'}</td>
                    <td className={margin != null && margin < 0 ? 'money-loss' : margin > 0 ? 'money-gain' : ''}>{margin == null ? '—' : money(margin)}</td>
                    <td><span className={`status status-${car.status.toLowerCase()}`}>{statusText[car.status]}</span></td>
                    <td>{user.role === 'ADMIN' && car.status === 'READY_FOR_REVIEW' && <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => { setSelected(car); setPrice(car.salePrice || ''); }}>Duyệt giá bán</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ready.length === 0 && <div className="empty">Chưa có xe hoàn tất bảo dưỡng.</div>}
        </div>
      </div>
      {selected && (
        <Modal title="Duyệt giá bán xe" subtitle={`${selected.brand} ${selected.model} · ${selected.plate}`} onClose={() => !busy && setSelected(null)}>
          <div className="cost-breakdown">
            <div><span>Giá thu mua</span><b>{money(selected.purchasePrice)}</b></div>
            <div><span>Chi phí bảo dưỡng</span><b>{money(selected.maintenance.reduce((sum, item) => sum + Number(item.amount), 0))}</b></div>
            <div className="cost-total"><span>Giá vốn hiện tại</span><b>{money(carCost(selected))}</b></div>
          </div>
          <div className="field">
            <label>Giá bán niêm yết (VNĐ)</label>
            <input type="number" value={price} disabled={busy} onChange={(event) => setPrice(event.target.value)} />
          </div>
          {preview != null && !Number.isNaN(preview) && (
            <div className={`margin-preview ${preview < 0 ? 'loss' : 'gain'}`}>
              Lãi/lỗ tạm tính nếu bán mức giá này: <b className={preview < 0 ? 'money-loss' : 'money-gain'}>{money(preview)}</b>
            </div>
          )}
          <div className="notice">Chỉ xác nhận khi xe đã sẵn sàng đưa ra kinh doanh. Giá vốn là tổng giá mua, bảo dưỡng và bảo hành hiện ghi nhận.</div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setSelected(null)} disabled={busy}>Hủy</button>
            <ActionButton busy={busyKey === 'approve-price'} disabled={busy} onClick={approve}>Xác nhận xe đủ điều kiện bán</ActionButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
