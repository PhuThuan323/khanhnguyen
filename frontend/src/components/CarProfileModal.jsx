import { useState } from 'react';
import Modal from './Modal';
import ActionButton from './ActionButton';

function toForm(car) {
  return {
    plate: car.plate || '',
    brand: car.brand || '',
    model: car.model || '',
    year: car.year ?? '',
    odo: car.odo ?? '',
    color: car.color || '',
    purchasePrice: car.purchasePrice ?? '',
    seller: car.seller || '',
    phone: car.phone || '',
    note: car.note || '',
  };
}

export default function CarProfileModal({ car, busy, onClose, onSave }) {
  const [form, setForm] = useState(() => toForm(car));
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const save = () => {
    if (!form.plate.trim() || !form.model.trim() || !form.purchasePrice) {
      alert('Vui lòng nhập biển số, dòng xe và giá thu mua.');
      return;
    }
    onSave({
      plate: form.plate.trim(),
      brand: form.brand.trim() || 'Khác',
      model: form.model.trim(),
      year: Number(form.year) || car.year,
      odo: Number(form.odo) || 0,
      color: form.color.trim(),
      purchasePrice: Number(form.purchasePrice),
      seller: form.seller.trim(),
      phone: form.phone.trim(),
      note: form.note,
    });
  };

  return (
    <Modal title="Sửa hồ sơ xe" subtitle={`${car.id} · ${car.plate}`} onClose={busy ? () => {} : onClose} wide>
      <div className="form-grid">
        <Field label="Biển số xe *" value={form.plate} onChange={set('plate')} />
        <Field label="Hãng xe" value={form.brand} onChange={set('brand')} />
        <Field label="Dòng xe *" value={form.model} onChange={set('model')} />
        <Field label="Năm sản xuất" value={form.year} onChange={set('year')} type="number" />
        <Field label="ODO (km)" value={form.odo} onChange={set('odo')} type="number" />
        <Field label="Màu xe" value={form.color} onChange={set('color')} />
        <Field label="Giá thu mua (VNĐ) *" value={form.purchasePrice} onChange={set('purchasePrice')} type="number" />
        <Field label="Tên người bán" value={form.seller} onChange={set('seller')} />
        <Field label="Số điện thoại người bán" value={form.phone} onChange={set('phone')} />
        <div className="field field-span">
          <label>Ghi chú hồ sơ</label>
          <textarea value={form.note} onChange={set('note')} rows={4} disabled={busy} />
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Hủy</button>
        <ActionButton busy={busy} onClick={save}>Lưu hồ sơ</ActionButton>
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={onChange} />
    </div>
  );
}
