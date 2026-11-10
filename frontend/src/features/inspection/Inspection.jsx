import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { money,vnDate } from '../../lib/storage';
import {formatVnd} from '../../components/VndInput';
import { api, uploadFile } from '../../lib/api';
import { SecurePhoto } from '../../components/SecureMedia';

const sections = ['Ca Bô - Hầm Máy','4 cửa - 4 nách','Cốp Xe','Gầm','Bên ngoài xe','Nội thất','Đồng hồ','Điện xe - Máy lạnh','Động Cơ','Số cà'];
const initialForm = { plate: '', brand: 'Toyota', model: '', year: '2020', odo: '', color: '', purchasePrice: '', seller: '', phone: '',inspectionDueAt:'' };

const getBlock = (car, section) => car?.inspectionBlocks?.find((x) => x.section === section);

function getSectionMeta(car, section) {
  const block = getBlock(car, section);
  const hasCondition = Boolean(block?.condition && block.condition !== 'Chưa kiểm tra');
  const hasPhotos = (block?.photos?.length || 0) > 0;
  const hasComments = (block?.comments?.length || 0) > 0;
  const complete = hasCondition && hasPhotos;
  const started = hasCondition || hasPhotos || hasComments;
  const missing = [];
  if (!hasCondition) missing.push('đánh giá');
  if (!hasPhotos) missing.push('ảnh');
  // Ghi nhận nhận xét của nhân viên là tùy chọn.
  
  return { block, hasCondition, hasPhotos, hasComments, complete, started, missing };
}

function findNextSection(car) {
  return sections.find((section) => !getSectionMeta(car, section).complete) || sections[0];
}

function progressSummary(car) {
  const metas = sections.map((section) => ({ section, ...getSectionMeta(car, section) }));
  return {
    items: metas,
    done: metas.filter((item) => item.complete).length,
    started: metas.filter((item) => item.started).length,
    total: metas.length,
    canComplete: metas.every((item) => item.complete),
  };
}

export default function Inspection({ cars, onRefresh, user, users = [] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState(sections[0]);
  const [search,setSearch]=useState('');
  const [dueEditor,setDueEditor]=useState(null);

  const selected = cars.find((c) => c.id === selectedId);
  const summary = useMemo(() => (selected ? progressSummary(selected) : null), [selected]);

  const list = useMemo(
    () => cars.filter((c) => ['INSPECTION', 'MAINTENANCE', 'READY_FOR_REVIEW', 'FOR_SALE', 'CUSTOMER_CLOSED', 'DEPOSITED', 'SOLD'].includes(c.status) && `${c.plate} ${c.brand} ${c.model} ${c.profileCode||''} ${c.seller||''}`.toLowerCase().includes(search.toLowerCase().trim())),
    [cars,search],
  );

  useEffect(() => {
    if (selected) {
      setAssignees(selected.inspectionAssignees || []);
      if (!sections.includes(activeSection)) setActiveSection(findNextSection(selected));
    }
  }, [selected]);

  const invoke = async (fn, okMessage = '') => {
    setBusy(true);
    setError('');
    if (okMessage) setSuccess('');
    try {
      await fn();
      if (okMessage) setSuccess(okMessage);
    } catch (e) {
      setError(e.message);
    } finally {
      await onRefresh();
      setBusy(false);
    }
  };

  const openCar = (car) => {
    setSelectedId(car.id);
    setAssignees(car.inspectionAssignees || []);
    setActiveSection(findNextSection(car));
    setSuccess('');
    setError('');
  };

  const create = () =>
    invoke(async () => {
      const d = { ...form, year: Number(form.year), odo: Number(form.odo || 0), purchasePrice: Number(form.purchasePrice || 0), inspectionDueAt:form.inspectionDueAt?new Date(form.inspectionDueAt+'T00:00:00+07:00').toISOString():undefined };
      if (!d.plate.trim() || !d.model.trim()) throw new Error('Hãy nhập biển số và dòng xe.');
      const car = await api('/cars', { method: 'POST', body: d });
      setCreateOpen(false);
      setForm(initialForm);
      openCar(car);
    }, 'Đã tạo hồ sơ xe thành công.');

  const saveAssignments = () =>
    invoke(async () => {
      const out = await api(`/cars/${selectedId}/assignments`, { method: 'PUT', body: { employeeIds: assignees } });
      setAssignees(out.employeeIds || assignees);
    }, 'Đã lưu phân công kiểm định.');

  const updateCondition = (section, condition) =>
    invoke(async () => {
      await api(`/inspection/cars/${selectedId}/blocks/${encodeURIComponent(section)}`, { method: 'PUT', body: { condition } });
    }, 'Đã cập nhật đánh giá hạng mục.');

  const upload = (section, files) =>
    invoke(async () => {
      for (const f of Array.from(files || [])) await uploadFile(`/inspection/cars/${selectedId}/blocks/${encodeURIComponent(section)}/photos`, f);
    }, 'Đã tải ảnh kiểm định.');

  const replace = (photoId, file) =>
    invoke(async () => {
      await uploadFile(`/inspection/photos/${photoId}`, file, 'PUT');
      setPreview(null);
    }, 'Đã thay ảnh kiểm định.');

  const remove = (photoId) => {
    if (!window.confirm('Xóa ảnh kiểm định này?')) return;
    invoke(async () => {
      await api(`/inspection/photos/${photoId}`, { method: 'DELETE' });
      setPreview(null);
    }, 'Đã xóa ảnh kiểm định.');
  };

  const addComment = (section, content) =>
    invoke(async () => {
      await api(`/inspection/cars/${selectedId}/blocks/${encodeURIComponent(section)}/comments`, { method: 'POST', body: { content } });
    }, 'Đã thêm nhận xét.');

  const complete = () =>
    invoke(async () => {
      await api(`/inspection/cars/${selectedId}/complete`, { method: 'PUT' });
      setSelectedId(null);
    }, 'Đã chốt kiểm định và chuyển xe sang bảo dưỡng.');

  const currentMeta = selected ? getSectionMeta(selected, activeSection) : null;

  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">VEHICLE INSPECTION</div>
          <h2>Kiểm định xe theo quy trình</h2>
          <p>Hồ sơ được chia theo từng hạng mục rõ ràng. Admin chốt kiểm định xong mới chuyển xe sang bảo dưỡng.</p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            ＋ Tiếp nhận xe
          </button>
        )}
      </div>

      <div className="info-banner">
        ⓘ <span>Nhân viên chỉ được xem và thao tác trên những xe đã được phân công; các dữ liệu không có quyền truy cập sẽ được ẩn hoàn toàn.</span>
      </div>

      {error && !selected && <div className="error-text">{error}</div>}
      {success && !selected && <div className="notice success-notice">{success}</div>}

      <div className="panel" style={{padding:15,marginBottom:12}}><label>Tìm kiếm xe kiểm định</label><input style={{width:'100%'}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nhập biển số, tên xe, mã hồ sơ hoặc người bán" /></div>
      <div className="panel panel-vucar">
        <div className="panel-head">
          <div>
            <h3>Danh sách xe kiểm định và lịch sử</h3>
            <p>Mở hồ sơ để phân công, kiểm định từng phần và theo dõi tiến độ.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>XE / MÃ HỒ SƠ</th>
                {user.role === 'ADMIN' && (
                  <>
                    <th>NGƯỜI BÁN</th>
                    <th>GIÁ THU MUA</th>
                  </>
                )}
                <th>TRẠNG THÁI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const stat = progressSummary(c);
                return (
                  <tr key={c.id}>
                    <td>
                      <b>{c.brand} {c.model}</b>
                      <small>{c.plate} · {c.year} · {c.profileCode} {c.inspectionDueAt?`· Hạn ${new Date(c.inspectionDueAt).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}`:''}</small>
                    </td>
                    {user.role === 'ADMIN' && (
                      <>
                        <td>{c.seller || '—'}<small>{c.phone}</small></td>
                        <td>{money(c.purchasePrice)}</td>
                      </>
                    )}
                    <td>
                      <div className="inspection-table-status">
                        <span className={`status ${c.inspection?.inspectedAt ? 'status-for_sale' : 'status-inspection'}`}>
                          {c.inspection?.inspectedAt ? 'Đã kiểm định' : 'Đang kiểm định'}
                        </span>
                        {!c.inspection?.inspectedAt && <small>{stat.done}/{stat.total} hạng mục hoàn tất</small>}
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => openCar(c)}>
                        Mở hồ sơ
                      </button> {user.role==='ADMIN'&&<button className="btn btn-outline btn-sm" onClick={()=>setDueEditor({carId:c.id,value:c.inspectionDueAt?vnDate(c.inspectionDueAt):''})}>Chọn hạn kiểm định</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!list.length && <div className="empty">Không có xe được phân công.</div>}
        </div>
      </div>

      {dueEditor&&<Modal title="Chọn hạn cần hoàn tất kiểm định" subtitle={cars.find(c=>c.id===dueEditor.carId)?.plate||''} onClose={()=>setDueEditor(null)}><div className="field"><label>Chọn ngày từ lịch</label><input type="date" value={dueEditor.value} onChange={e=>setDueEditor({...dueEditor,value:e.target.value})}/></div><div className="modal-actions"><button className="btn btn-outline" onClick={()=>setDueEditor(null)}>Hủy</button><button className="btn btn-primary" disabled={busy||!dueEditor.value} onClick={()=>invoke(async()=>{await api(`/cars/${dueEditor.carId}/details`,{method:'PUT',body:{inspectionDueAt:new Date(`${dueEditor.value}T00:00:00+07:00`).toISOString()}});setDueEditor(null)},'Đã cập nhật hạn kiểm định')}>Lưu hạn</button></div></Modal>}
      {createOpen && (
        <Modal title="Tiếp nhận xe" onClose={() => setCreateOpen(false)} wide>
          <div className="form-grid">
            {[
              ['Biển số *', 'plate'],
              ['Hãng xe', 'brand'],
              ['Dòng xe *', 'model'],
              ['Năm sản xuất', 'year'],
              ['ODO (km)', 'odo'],
              ['Màu xe', 'color'],
              ['Giá thu mua', 'purchasePrice'],
              ['Tên người bán', 'seller'],
              ['Số điện thoại người bán', 'phone'],
              ['Hạn cần hoàn tất kiểm định', 'inspectionDueAt'],
            ].map(([title, key]) => (
              <div className="field" key={key}>
                <label>{title}</label>
                <input
                  value={key==='purchasePrice'?formatVnd(form[key]):form[key]}
                  type={key==='inspectionDueAt'?'date':(['year','odo'].includes(key)?'number':'text')}
                  inputMode={key==='purchasePrice'?'numeric':undefined}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: key==='purchasePrice'?e.target.value.replace(/[^0-9]/g,''):e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setCreateOpen(false)}>Hủy</button>
            <button disabled={busy} className="btn btn-primary" onClick={create}>Lưu hồ sơ</button>
          </div>
        </Modal>
      )}

      {selected && summary && (
        <Modal
          title={`Kiểm định · ${selected.plate}`}
          subtitle={`${selected.brand} ${selected.model} · ${selected.profileCode}`}
          onClose={() => { setSelectedId(null); setPreview(null); }}
          wide
        >
          {error && <div className="error-text">{error}</div>}
          {success && <div className="notice success-notice">{success}</div>}

          <div className="inspection-workflow">
            <aside className="inspection-rail">
              <div className="workflow-summary-card">
                <span className="workflow-kicker">TIẾN ĐỘ HỒ SƠ</span>
                <h4>{selected.brand} {selected.model}</h4>
                <p>{selected.plate} · {summary.done}/{summary.total} hạng mục hoàn tất</p>
                <div className="workflow-progress-bar"><span style={{ width: `${(summary.done / summary.total) * 100}%` }} /></div>
                <div className="workflow-progress-meta">
                  <strong>{summary.done}/{summary.total}</strong>
                  <span>{summary.canComplete ? 'Đủ điều kiện chốt kiểm định' : `Còn ${summary.total - summary.done} hạng mục cần hoàn thiện`}</span>
                </div>
              </div>

              {user.role === 'ADMIN' && selected.status === 'INSPECTION' && (
                <div className="workflow-assignment-card">
                  <div className="workflow-card-head">
                    <div>
                      <b>Phân công kiểm định</b>
                      <small>Có thể giao một xe cho nhiều nhân viên</small>
                    </div>
                    <button disabled={busy} className="btn btn-outline btn-sm" onClick={saveAssignments}>Lưu phân công</button>
                  </div>
                  <div className="employee-checks employee-checks-column">
                    {users.filter((u) => u.role === 'EMPLOYEE' && u.active).map((u) => (
                      <label key={u.id}>
                        <input
                          type="checkbox"
                          checked={assignees.includes(u.id)}
                          onChange={(e) => setAssignees((a) => (e.target.checked ? [...new Set([...a, u.id])] : a.filter((id) => id !== u.id)))}
                        />
                        <span>
                          <b>{u.name}</b>
                          <small>{u.email}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="workflow-steps-card">
                <div className="workflow-card-head compact">
                  <div>
                    <b>Checklist kiểm định</b>
                    <small>Chọn hạng mục để tiếp tục thao tác</small>
                  </div>
                </div>
                <div className="workflow-step-list">
                  {summary.items.map((item, index) => (
                    <button
                      key={item.section}
                      className={`workflow-step ${activeSection === item.section ? 'active' : ''} ${item.complete ? 'complete' : item.started ? 'started' : 'pending'}`}
                      onClick={() => setActiveSection(item.section)}
                    >
                      <span className="workflow-step-index">{item.complete ? '✓' : index + 1}</span>
                      <span className="workflow-step-copy">
                        <strong>{item.section}</strong>
                        <small>
                          {item.complete
                            ? 'Đã có ảnh và đánh giá'
                            : item.started
                              ? `Còn thiếu: ${item.missing.join(', ')}`
                              : 'Chưa bắt đầu'}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {user.role === 'ADMIN' && selected.status === 'INSPECTION' && !selected.inspection?.inspectedAt && (
                <div className="workflow-actions-card">
                  <button disabled={busy} className="btn btn-primary btn-block" onClick={complete}>
                    Chuyển trạng thái → Bảo dưỡng
                  </button>
                  <small>Admin chủ động chuyển trạng thái. Các hạng mục thiếu ảnh/đánh giá vẫn được đánh dấu để theo dõi.</small>
                </div>
              )}
            </aside>

            <section className="inspection-stage">
<div className="inspection-stage-head">
                <div>
                  <div className="eyebrow">HẠNG MỤC ĐANG XỬ LÝ</div>
                  <h3>{activeSection}</h3>
                  <p>
                    {currentMeta?.complete
                      ? 'Hạng mục này đã hoàn tất.'
                      : currentMeta?.started
                        ? `Hạng mục đang được cập nhật, còn thiếu: ${currentMeta?.missing.join(', ')}.`
                        : 'Bắt đầu thêm ảnh, nhận xét và đánh giá cho hạng mục này.'}
                  </p>
                </div>
                <div className={`step-badge ${currentMeta?.complete ? 'complete' : currentMeta?.started ? 'started' : 'pending'}`}>
                  {currentMeta?.complete ? 'Hoàn tất' : currentMeta?.started ? 'Đang làm' : 'Chưa làm'}
                </div>
              </div>

              <div className="stage-card-grid">
                <div className="stage-card">
                  <label>Tình trạng hạng mục</label>
                  <select disabled={user.role !== 'ADMIN' || selected.status !== 'INSPECTION' || busy} value={currentMeta?.block?.condition || 'Chưa kiểm tra'} onChange={(e) => updateCondition(activeSection, e.target.value)}>
                    {['Chưa kiểm tra', 'Tốt', 'Cần theo dõi', 'Cần sửa chữa'].map((x) => <option key={x}>{x}</option>)}
                  </select>
                  {user.role !== 'ADMIN' && <small>Nhân viên chỉ thêm ảnh và nhận xét. Admin sẽ chốt đánh giá cuối cùng.</small>}
                </div>
                <div className="stage-card">
                  <label>Ảnh kiểm định</label>
                  <label className="upload-label upload-label-strong">
                    ＋ Tải ảnh kiểm định
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={selected.status !== 'INSPECTION' || busy} onChange={(e) => { upload(activeSection, e.target.files); e.target.value = ''; }} />
                  </label>
                  <small>Ảnh được xem trực tiếp ngay trong trình duyệt, có thể xóa và thay ảnh mới.</small>
                </div>
              </div>

              
              <div className="stage-panel">
                <div className="panel-head compact">
                  <div>
                    <h3>Ảnh đã tải lên</h3>
                    <p>{currentMeta?.block?.photos?.length || 0} ảnh trong hạng mục này</p>
                  </div>
                </div>
                {currentMeta?.block?.photos?.length ? (
                  <div className="secure-photo-list secure-photo-list-lg">
                    {currentMeta.block.photos.map((p) => (
                      <div key={p.id}><SecurePhoto
                        key={`${p.id}-${p.createdAt}`}
                        photo={p}
                        editable={selected.status === 'INSPECTION' && (user.role === 'ADMIN' || p.uploadedById === user.id)}
                        onPreview={setPreview}
                        onReplace={(file) => replace(p.id, file)}
                        onDelete={() => remove(p.id)}
                      />{user.role==='ADMIN'&&<button className="btn btn-outline btn-sm" onClick={()=>invoke(async()=>api(`/cars/${selectedId}/details`,{method:'PUT',body:{coverPhotoId:p.id}}),'Đã đặt ảnh đại diện xe')}>{selected.coverPhotoId===p.id?'✓ Ảnh đại diện':'Chọn ảnh đại diện'}</button>}</div>
                    ))}
                  </div>
                ) : (
                  <div className="empty empty-inline">Chưa có ảnh kiểm định cho hạng mục này.</div>
                )}
              </div>

              <InspectionComments
                key={activeSection}
                section={activeSection}
                comments={currentMeta?.block?.comments || []}
                disabled={busy || selected.status !== 'INSPECTION'}
                onComment={addComment}
              />
            </section>
          </div>

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setSelectedId(null)}>Đóng hồ sơ</button>
          </div>
        </Modal>
      )}

      {preview && (
        <div className="media-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPreview(null)} role="dialog" aria-label="Xem ảnh kiểm định">
          <button className="media-close" onClick={() => setPreview(null)} aria-label="Đóng">×</button>
          <img src={preview.src} alt={preview.name} />
        </div>
      )}
    </div>
  );
}

function InspectionComments({ section, comments, disabled, onComment }) {
  const [draft, setDraft] = useState('');
  return (
    <div className="stage-panel">
      <div className="panel-head compact">
        <div>
          <h3>Nhận xét & ghi chú</h3>
          <p>Người dùng có thể bổ sung nhiều nhận xét, admin sẽ thấy rõ ai là người cập nhật.</p>
        </div>
      </div>

      <div className="field inspection-comment inspection-comment-pro">
        <label>Ghi chú kết quả kiểm định</label>
        <textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Đánh giá tình trạng hạng mục này…" />
        <div className="comment-actions-row">
          <button
            disabled={disabled || !draft.trim()}
            className="btn btn-outline btn-sm"
            onClick={() => {
              const text = draft.trim();
              onComment(section, text);
              setDraft('');
            }}
          >
            Thêm nhận xét
          </button>
          <small>{comments.length} nhận xét đã ghi nhận</small>
        </div>
      </div>

      <div className="block-comments block-comments-pro">
        {comments.length ? comments.map((c) => (
          <div className="inspection-comment-entry inspection-comment-entry-pro" key={c.id}>
            <div className="comment-head">
              <div>
                <b>{c.author?.name || 'Nhân viên'}</b>
                <small>{c.author?.email || ''}</small>
              </div>
              <span>{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
            </div>
            <p>{c.content}</p>
          </div>
        )) : <div className="empty empty-inline">Chưa có nhận xét cho hạng mục này.</div>}
      </div>
    </div>
  );
}
