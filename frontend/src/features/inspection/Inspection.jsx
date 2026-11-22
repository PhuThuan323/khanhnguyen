import { useState } from 'react';
import Modal from '../../components/Modal';
import ActionButton from '../../components/ActionButton';
import CarProfileModal from '../../components/CarProfileModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { money, makeId, today } from '../../lib/storage';
import { useBusy, readFileAsDataUrl } from '../../lib/async';

const sections = ['Nội thất', 'Ngoại thất', 'Động cơ', 'ODO & đồng hồ', 'Bánh xe & lốp', 'Khung gầm'];
const emptyForm = { plate: '', brand: 'Toyota', model: '', year: '2020', odo: '', color: '', purchasePrice: '', seller: '', phone: '', note: '' };

export default function Inspection({ cars, setCars, user, onDeleteCar }) {
  const { busy, busyKey, run } = useBusy();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [checks, setChecks] = useState({});
  const [photos, setPhotos] = useState({});
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const add = () => {
    if (!form.plate || !form.model || !form.purchasePrice) {
      alert('Vui lòng nhập biển số, dòng xe và giá thu mua');
      return;
    }
    run('create-car', async () => {
      const car = {
        ...form,
        id: makeId('CAR'),
        year: Number(form.year),
        odo: Number(form.odo),
        purchasePrice: Number(form.purchasePrice),
        status: 'INSPECTION',
        createdAt: today(),
        inspection: {},
        maintenance: [],
        leads: [],
        warranty: [],
      };
      setCars((prev) => [car, ...prev]);
      setSelected(car);
      setChecks({});
      setPhotos({});
      setOpen(false);
      setForm(emptyForm);
    });
  };

  const openRecord = (car) => {
    setSelected(car);
    setChecks(car.inspection?.checks || {});
    setPhotos(car.inspection?.photos || {});
  };

  const saveInspection = () => run('save-inspection', async () => {
    setCars((prev) => prev.map((car) => car.id === selected.id ? {
      ...car,
      note: selected.note || '',
      inspection: { checks, photos, note: selected.note || '', inspectedBy: user.id, inspectedAt: today() },
      status: 'MAINTENANCE',
    } : car));
    setSelected(null);
    alert('Đã lưu hồ sơ kiểm định. Xe chuyển sang bước bảo dưỡng.');
  });

  const saveProfile = (patch) => run('save-profile', async () => {
    setCars((prev) => prev.map((car) => car.id === editing.id ? { ...car, ...patch } : car));
    setSelected((prev) => prev && prev.id === editing.id ? { ...prev, ...patch } : prev);
    setEditing(null);
  });

  const remove = () => run('delete-car', async () => {
    const id = confirm.id;
    onDeleteCar(id);
    if (selected?.id === id) setSelected(null);
    setEditing(null);
    setConfirm(null);
  });

  const uploadPhotos = (section, event) => {
    const input = event.target;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || busy) return;
    if (files.some((file) => file.size > 500000)) {
      alert('Mỗi ảnh tối đa 500 KB trong bản demo LocalStorage.');
      return;
    }
    run(`upload-${section}`, async () => {
      try {
        const loaded = await Promise.all(files.map(async (file) => ({ name: file.name, dataUrl: await readFileAsDataUrl(file) })));
        setPhotos((prev) => ({ ...prev, [section]: [...(prev[section] || []), ...loaded] }));
      } catch {
        alert('Không đọc được ảnh. Vui lòng thử lại.');
      }
    });
  };

  const list = cars.filter((car) => car.status === 'INSPECTION' || car.inspection?.inspectedAt);

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">VEHICLE INTAKE</div>
          <h2>Hồ sơ tiếp nhận & kiểm định</h2>
          <p>Ghi nhận thông tin xe, giá thu mua và tình trạng trước khi nhập kho.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>＋ Tiếp nhận xe</button>
      </div>
      <div className="info-banner"><span>Mỗi xe được cấp một mã hồ sơ riêng. Nhân viên kiểm định cần ghi nhận đầy đủ 6 hạng mục và hình ảnh thực tế.</span></div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>MÃ HỒ SƠ</th><th>XE / BIỂN SỐ</th><th>NGƯỜI BÁN</th><th>GIÁ THU MUA</th><th>KIỂM ĐỊNH</th><th>THAO TÁC</th></tr>
            </thead>
            <tbody>
              {list.map((car) => (
                <tr key={car.id}>
                  <td><b>{car.id}</b><small>{car.createdAt}</small></td>
                  <td><b>{car.brand} {car.model}</b><small>{car.plate} · {car.year}</small></td>
                  <td>{car.seller}<small>{car.phone}</small></td>
                  <td>{money(car.purchasePrice)}</td>
                  <td><span className={`status ${car.inspection?.inspectedAt ? 'status-for_sale' : 'status-inspection'}`}>{car.inspection?.inspectedAt ? 'Đã kiểm định' : 'Chờ kiểm định'}</span></td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openRecord(car)}>Mở hồ sơ</button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(car)}>Sửa hồ sơ</button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm(car)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="empty">Chưa có hồ sơ cần kiểm định.</div>}
        </div>
      </div>

      {open && (
        <Modal title="Tiếp nhận xe mới" subtitle="Nhập thông tin cơ bản và giá thu mua ban đầu" onClose={() => !busy && setOpen(false)} wide>
          <div className="form-grid">
            <Field label="Biển số xe *" value={form.plate} onChange={(value) => update('plate', value)} placeholder="51K-123.45" />
            <Field label="Hãng xe" value={form.brand} onChange={(value) => update('brand', value)} />
            <Field label="Dòng xe *" value={form.model} onChange={(value) => update('model', value)} placeholder="Vios G / CX-5 Premium" />
            <Field label="Năm sản xuất" value={form.year} onChange={(value) => update('year', value)} type="number" />
            <Field label="ODO (km)" value={form.odo} onChange={(value) => update('odo', value)} type="number" />
            <Field label="Màu xe" value={form.color} onChange={(value) => update('color', value)} />
            <Field label="Giá thu mua (VNĐ) *" value={form.purchasePrice} onChange={(value) => update('purchasePrice', value)} type="number" />
            <Field label="Tên người bán" value={form.seller} onChange={(value) => update('seller', value)} />
            <Field label="Số điện thoại người bán" value={form.phone} onChange={(value) => update('phone', value)} />
            <div className="field field-span">
              <label>Ghi chú tiếp nhận</label>
              <textarea value={form.note} onChange={(event) => update('note', event.target.value)} rows={3} disabled={busy} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)} disabled={busy}>Hủy</button>
            <ActionButton busy={busyKey === 'create-car'} disabled={busy} onClick={add}>Tạo hồ sơ xe</ActionButton>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal title={`Kiểm định · ${selected.plate}`} subtitle={`${selected.id} · ${selected.brand} ${selected.model}`} onClose={() => !busy && setSelected(null)} wide>
          <div className="record-actions">
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setEditing(selected)}>Sửa hồ sơ</button>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirm(selected)}>Xóa hồ sơ</button>
          </div>
          <div className="inspection-grid">
            {sections.map((section) => (
              <div className="inspection-item" key={section}>
                <b>{section}</b>
                <select value={checks[section] || 'Chưa kiểm tra'} disabled={busy} onChange={(event) => setChecks((prev) => ({ ...prev, [section]: event.target.value }))}>
                  <option>Chưa kiểm tra</option>
                  <option>Tốt</option>
                  <option>Cần theo dõi</option>
                  <option>Cần sửa chữa</option>
                </select>
                <label className={`upload-label ${busy ? 'is-locked' : ''}`}>
                  {String(busyKey).startsWith('upload-') ? 'Đang tải tệp...' : `＋ Ảnh ${section}`}
                  <input type="file" accept="image/*" multiple disabled={busy} onChange={(event) => uploadPhotos(section, event)} />
                </label>
                {photos[section]?.length > 0 && (
                  <div className="photo-previews">
                    {photos[section].map((photo, index) => (
                      <a key={`${photo.name}-${index}`} href={photo.dataUrl || '#'} target="_blank" rel="noreferrer">
                        {photo.dataUrl ? <img src={photo.dataUrl} alt={photo.name} /> : photo.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="field">
            <label>Ghi chú kiểm định</label>
            <textarea value={selected.note || ''} disabled={busy} onChange={(event) => setSelected((prev) => ({ ...prev, note: event.target.value }))} />
          </div>
          <div className="notice">Giá thu mua: <b>{money(selected.purchasePrice)}</b>. Ảnh được lưu trong trình duyệt của bản demo, tối đa 500 KB mỗi ảnh.</div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setSelected(null)} disabled={busy}>Đóng</button>
            <ActionButton busy={busyKey === 'save-inspection'} disabled={busy} busyText="Đang lưu hồ sơ..." onClick={saveInspection}>Lưu kiểm định & chuyển bảo dưỡng</ActionButton>
          </div>
        </Modal>
      )}

      {editing && <CarProfileModal car={editing} busy={busy} onClose={() => setEditing(null)} onSave={saveProfile} />}
      {confirm && (
        <ConfirmDialog
          title="Xóa hồ sơ xe"
          text={`Xóa hồ sơ ${confirm.id} · ${confirm.plate}? Dữ liệu kiểm định, bảo dưỡng, khách hàng và bảo hành của xe sẽ mất.`}
          confirmText="Xóa hồ sơ"
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
