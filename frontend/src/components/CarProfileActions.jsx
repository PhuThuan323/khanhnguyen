import { useState } from 'react';
import Modal from './Modal';
import { api } from '../lib/api';

export default function CarProfileActions({ car, busy = false, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [localBusy, setLocalBusy] = useState(false);
  const locked = busy || localBusy;
  const canDelete = ['INSPECTION', 'MAINTENANCE', 'READY_FOR_REVIEW', 'CANCELLED'].includes(car.status);
  const start = () => {
    setForm({
      plate: car.plate || '',
      brand: car.brand || '',
      model: car.model || '',
      year: car.year ?? '',
      odo: car.odo ?? '',
      color: car.color || '',
      purchasePrice: car.purchasePrice ?? '',
    });
    setOpen(true);
  };
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const save = async () => {
    if (locked) return;
    if (!form.plate.trim() || !form.model.trim()) {
      alert('Nhập biển số và dòng xe.');
      return;
    }
    setLocalBusy(true);
    try {
      await api(`/cars/${car.id}/details`, {
        method: 'PUT',
        body: {
          plate: form.plate.trim(),
          brand: form.brand.trim() || car.brand,
          model: form.model.trim(),
          year: Number(form.year),
          odo: Number(form.odo || 0),
          color: form.color.trim() || null,
          purchasePrice: Number(form.purchasePrice || 0),
        },
      });
      setOpen(false);
      await onRefresh();
    } catch (error) {
      alert(error.message);
    } finally {
      setLocalBusy(false);
    }
  };
  const remove = async () => {
    if (locked) return;
    if (!window.confirm(`Xóa hồ sơ ${car.plate}? Dữ liệu kiểm định và bảo dưỡng của xe sẽ mất.`)) return;
    setLocalBusy(true);
    try {
      await api(`/cars/${car.id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (error) {
      alert(error.message);
    } finally {
      setLocalBusy(false);
    }
  };
  return (
    <>
      <button type="button" className="btn btn-outline btn-sm" disabled={locked} onClick={start}>Sửa hồ sơ</button>
      {canDelete && <button type="button" className="btn btn-outline btn-sm" disabled={locked} onClick={remove}>Xóa hồ sơ</button>}
      {open && form && (
        <Modal title="Sửa hồ sơ xe" subtitle={`${car.profileCode || ''} · ${car.plate}`} onClose={() => !locked && setOpen(false)} wide>
          <div className="form-grid">
            <div className="field"><label>Biển số *</label><input value={form.plate} disabled={locked} onChange={set('plate')} /></div>
            <div className="field"><label>Hãng xe</label><input value={form.brand} disabled={locked} onChange={set('brand')} /></div>
            <div className="field"><label>Dòng xe *</label><input value={form.model} disabled={locked} onChange={set('model')} /></div>
            <div className="field"><label>Năm sản xuất</label><input type="number" value={form.year} disabled={locked} onChange={set('year')} /></div>
            <div className="field"><label>ODO (km)</label><input type="number" value={form.odo} disabled={locked} onChange={set('odo')} /></div>
            <div className="field"><label>Màu xe</label><input value={form.color} disabled={locked} onChange={set('color')} /></div>
            <div className="field"><label>Giá thu mua (VNĐ)</label><input type="number" value={form.purchasePrice} disabled={locked} onChange={set('purchasePrice')} /></div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" disabled={locked} onClick={() => setOpen(false)}>Hủy</button>
            <button type="button" className="btn btn-primary" disabled={locked} onClick={save}>{locked ? 'Đang lưu...' : 'Lưu hồ sơ'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
