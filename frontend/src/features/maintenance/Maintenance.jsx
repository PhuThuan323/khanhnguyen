import { useState } from 'react';
import Modal from '../../components/Modal';
import ActionButton from '../../components/ActionButton';
import CarProfileModal from '../../components/CarProfileModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { money, makeId, today } from '../../lib/storage';
import { useBusy, readFileAsDataUrl } from '../../lib/async';

const blank = { assign: '', task: '', amount: '', note: '', invoice: '', invoiceData: '', editId: null };

export default function Maintenance({ cars, setCars, users, user, onDeleteCar }) {
  const { busy, busyKey, run } = useBusy();
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const eligible = cars.filter((car) => ['MAINTENANCE', 'READY_FOR_REVIEW'].includes(car.status));
  const assigned = eligible.filter((car) => user.role === 'ADMIN' || car.maintenance.some((item) => item.assignedTo === user.id));
  const staff = users.filter((person) => person.role === 'EMPLOYEE');

  const openJob = (car) => {
    setSelected(car);
    const fallback = staff.find((person) => person.id === user.id)?.id || staff[0]?.id || user.id;
    setForm({ ...blank, assign: fallback });
  };

  const editJob = (item) => {
    setForm({
      assign: item.assignedTo || user.id,
      task: item.task || '',
      amount: item.amount ?? '',
      note: item.note || '',
      invoice: item.invoice || '',
      invoiceData: item.invoiceData || '',
      editId: item.id,
    });
  };

  const resetForm = () => setForm({ ...blank, assign: user.role === 'ADMIN' ? (staff[0]?.id || user.id) : user.id });

  const uploadInvoice = (event) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file || busy) return;
    if (file.size > 1000000) {
      alert('File tối đa 1 MB trong bản demo LocalStorage.');
      return;
    }
    run('upload-invoice', async () => {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setForm((prev) => ({ ...prev, invoice: file.name, invoiceData: dataUrl }));
      } catch {
        alert('Không đọc được tệp. Vui lòng thử lại.');
      }
    });
  };

  const save = () => {
    if (!form.task.trim() || !form.amount) {
      alert('Nhập hạng mục và chi phí');
      return;
    }
    run('save-job', async () => {
      const nextItem = {
        task: form.task.trim(),
        amount: Number(form.amount),
        note: form.note,
        invoice: form.invoice,
        invoiceData: form.invoiceData,
        assignedTo: form.assign || user.id,
      };
      const maintenance = form.editId
        ? selected.maintenance.map((item) => item.id === form.editId && !item.locked ? { ...item, ...nextItem, updatedAt: today() } : item)
        : [...selected.maintenance, { ...nextItem, id: makeId('MT'), createdBy: user.id, date: today(), locked: false }];
      const updated = { ...selected, status: 'MAINTENANCE', maintenance };
      setCars((prev) => prev.map((car) => car.id === selected.id ? updated : car));
      setSelected(updated);
      resetForm();
    });
  };

  const closeJob = (car) => {
    if (!car.maintenance.at(-1)) {
      alert('Chưa có nội dung bảo dưỡng');
      return;
    }
    run(`close-${car.id}`, async () => {
      setCars((prev) => prev.map((item) => item.id === car.id ? {
        ...item,
        status: 'READY_FOR_REVIEW',
        maintenance: item.maintenance.map((job) => ({ ...job, locked: true })),
      } : item));
    });
  };

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

  const visibleJobs = (car) => car.maintenance.filter((item) => user.role === 'ADMIN' || item.assignedTo === user.id);

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">WORKSHOP OPERATIONS</div>
          <h2>Điều phối & bảo dưỡng xe</h2>
          <p>Phân công nhân viên, ghi nhận hạng mục sửa chữa và kiểm soát hóa đơn.</p>
        </div>
      </div>
      <div className="stats-strip">
        <div><b>{eligible.length}</b><span>Xe trong quy trình</span></div>
        <div><b>{eligible.filter((car) => car.status === 'MAINTENANCE').length}</b><span>Đang bảo dưỡng</span></div>
        <div><b>{money(cars.reduce((sum, car) => sum + car.maintenance.filter((item) => user.role === 'ADMIN' || item.assignedTo === user.id).reduce((acc, item) => acc + Number(item.amount), 0), 0))}</b><span>Tổng chi phí đã ghi nhận</span></div>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>XE / MÃ HỒ SƠ</th><th>NGƯỜI PHỤ TRÁCH</th><th>HẠNG MỤC / GHI CHÚ</th><th>CHI PHÍ BẢO DƯỠNG</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr>
            </thead>
            <tbody>
              {assigned.map((car) => {
                const own = visibleJobs(car);
                return (
                  <tr key={car.id}>
                    <td><b>{car.brand} {car.model}</b><small>{car.plate} · {car.id}</small></td>
                    <td>{users.find((person) => person.id === car.maintenance.at(-1)?.assignedTo)?.name || 'Chưa phân công'}</td>
                    <td className="cell-wrap">
                      {own.length ? own.map((item) => (
                        <div className="table-note" key={item.id}>
                          <b>{item.task}</b>
                          {item.note ? <small>{item.note}</small> : null}
                          {item.invoice ? <small>Hóa đơn: {item.invoice}</small> : null}
                        </div>
                      )) : 'Chưa có hạng mục'}
                    </td>
                    <td><b>{money(own.reduce((sum, item) => sum + Number(item.amount), 0))}</b></td>
                    <td><span className={`status status-${car.status.toLowerCase()}`}>{car.status === 'READY_FOR_REVIEW' ? 'Chờ Admin duyệt' : 'Đang bảo dưỡng'}</span></td>
                    <td>
                      <div className="table-actions">
                        {car.status === 'MAINTENANCE'
                          ? <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => openJob(car)}>Cập nhật</button>
                          : <span className="status status-ready_for_review">Đã khóa hạng mục</span>}
                        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setEditing(car)}>Sửa hồ sơ</button>
                        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirm(car)}>Xóa</button>
                        {user.role === 'ADMIN' && car.status === 'MAINTENANCE' && (
                          <ActionButton className="btn btn-primary btn-sm" busy={busyKey === `close-${car.id}`} disabled={busy} busyText="Đang chốt..." onClick={() => closeJob(car)}>Chốt bảo dưỡng</ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {assigned.length === 0 && <div className="empty">Không có xe được phân công hoặc đang bảo dưỡng.</div>}
        </div>
      </div>

      {selected && (
        <Modal title="Cập nhật bảo dưỡng" subtitle={`${selected.id} · ${selected.plate}`} onClose={() => !busy && setSelected(null)} wide>
          <div className="record-actions">
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setEditing(selected)}>Sửa hồ sơ xe</button>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirm(selected)}>Xóa hồ sơ</button>
          </div>
          <div className="job-list">
            {visibleJobs(selected).length === 0 && <p className="empty-inline">Chưa có hạng mục bảo dưỡng.</p>}
            {visibleJobs(selected).map((item) => (
              <article className="job-card" key={item.id}>
                <div>
                  <b>{item.task}</b>
                  <span>{money(item.amount)} · {users.find((person) => person.id === item.assignedTo)?.name || 'Chưa phân công'} · {item.date}</span>
                  {item.note ? <p>{item.note}</p> : null}
                  {item.invoice ? <small className="file-link">{item.invoice}</small> : null}
                </div>
                {!item.locked && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => editJob(item)}>Sửa</button>}
              </article>
            ))}
          </div>
          <div className="maint-form">
            <div className="form-grid">
              <div className="field">
                <label>Nhân viên phụ trách</label>
                <select value={form.assign} onChange={set('assign')} disabled={busy || user.role !== 'ADMIN'}>
                  {staff.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Chi phí (VNĐ) *</label>
                <input type="number" value={form.amount} onChange={set('amount')} disabled={busy} />
              </div>
              <div className="field field-span">
                <label>Hạng mục bảo dưỡng *</label>
                <input value={form.task} onChange={set('task')} placeholder="Thay dầu, thay lốp..." disabled={busy} />
              </div>
              <div className="field field-span">
                <label>Ghi chú bảo dưỡng</label>
                <textarea value={form.note} onChange={set('note')} rows={4} placeholder="Mô tả tình trạng, phụ tùng, việc cần theo dõi..." disabled={busy} />
              </div>
              <div className="field field-span">
                <label>Hóa đơn / chứng từ (PDF hoặc ảnh, tối đa 1 MB)</label>
                <input className="file-input" type="file" accept="application/pdf,image/*" disabled={busy} onChange={uploadInvoice} />
                {form.invoiceData && <a href={form.invoiceData} target="_blank" rel="noreferrer" className="file-link">↗ {form.invoice}</a>}
                {busyKey === 'upload-invoice' && <small className="uploading">Đang đọc tệp, các nút lưu đang được khóa.</small>}
              </div>
            </div>
            <div className="notice">Tổng chi phí đã ghi nhận: <b>{money(visibleJobs(selected).reduce((sum, item) => sum + Number(item.amount), 0))}</b>. Nhân viên chỉ xem và cập nhật phần việc của mình. Muốn thêm hạng mục mới, bấm "Thêm mới" trước khi lưu.</div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={resetForm} disabled={busy}>Thêm mới</button>
              <button type="button" className="btn btn-outline" onClick={() => setSelected(null)} disabled={busy}>Hủy</button>
              <ActionButton busy={busyKey === 'save-job'} disabled={busy} busyText="Đang lưu..." onClick={save}>{form.editId ? 'Lưu hạng mục' : 'Thêm hạng mục'}</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {editing && <CarProfileModal car={editing} busy={busy} onClose={() => setEditing(null)} onSave={saveProfile} />}
      {confirm && (
        <ConfirmDialog
          title="Xóa hồ sơ xe"
          text={`Xóa hồ sơ ${confirm.id} · ${confirm.plate}? Hạng mục bảo dưỡng và dữ liệu liên quan của xe sẽ mất.`}
          confirmText="Xóa hồ sơ"
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
