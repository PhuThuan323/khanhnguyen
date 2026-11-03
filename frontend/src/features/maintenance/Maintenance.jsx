import { useState } from 'react';
import Modal from '../../components/Modal';
import { money } from '../../lib/storage';
import { api,uploadFile } from '../../lib/api';
import { SecureInvoiceViewer } from '../../components/SecureMedia';
const fmt=d=>d?new Date(d).toLocaleString('vi-VN'):'—';
export default function Maintenance({cars,onRefresh,user}){
  const [carId,setCarId]=useState(null),[task,setTask]=useState(''),[amount,setAmount]=useState(''),[note,setNote]=useState('');
  const [files,setFiles]=useState([]),[viewer,setViewer]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [expanded,setExpanded]=useState(null);
  const eligible=cars.filter(c=>['MAINTENANCE','READY_FOR_REVIEW','FOR_SALE','CUSTOMER_CLOSED','DEPOSITED','SOLD'].includes(c.status));
  const selected=cars.find(c=>c.id===carId);
  const doAction=async fn=>{setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{await onRefresh();setBusy(false)}};
  const add=()=>doAction(async()=>{
    if(!task.trim()||amount===''||Number(amount)<0)throw new Error('Nhập hạng mục và số tiền hợp lệ.');
    const record=await api(`/maintenance/cars/${carId}`,{method:'POST',body:{task,amount:Number(amount),note}});
    for(const f of files)await uploadFile(`/maintenance/${record.id}/invoices`,f);
    setCarId(null);setTask('');setAmount('');setNote('');setFiles([]);setExpanded(carId);
  });
  const uploadInvoice=(recordId,file)=>doAction(async()=>{await uploadFile(`/maintenance/${recordId}/invoices`,file)});
  const complete=car=>{if(!window.confirm(`Chốt bảo dưỡng xe ${car.plate}? Nhân viên sẽ không thể bổ sung chi phí.`))return;doAction(async()=>{await api(`/maintenance/cars/${car.id}/complete`,{method:'PUT'})})};
  const total=eligible.reduce((s,c)=>s+c.maintenance.reduce((t,m)=>t+Number(m.amount),0),0);
  return <div className="page-content">
    <div className="page-toolbar"><div><div className="eyebrow">WORKSHOP OPERATIONS</div><h2>Bảo dưỡng & lịch sử chi phí</h2><p>Mỗi nhân viên có thể thêm nhiều chi phí và nhiều hóa đơn. Admin xem đầy đủ lịch sử theo từng xe.</p></div></div>
    {error&&<div className="error-text">{error}</div>}
    <div className="stats-strip"><div><b>{eligible.length}</b><span>Xe đã/đang bảo dưỡng</span></div><div><b>{eligible.filter(c=>c.status==='MAINTENANCE').length}</b><span>Đang bảo dưỡng</span></div>{user.role==='ADMIN'&&<div><b>{money(total)}</b><span>Tổng chi phí bảo dưỡng</span></div>}</div>
    <div className="panel"><div className="table-wrap"><table><thead><tr><th>XE / HỒ SƠ</th><th>{user.role==='ADMIN'?'SỐ KHOẢN CHI':'SỐ KHOẢN ĐÃ NHẬP CỦA BẠN'}</th>{user.role==='ADMIN'&&<th>TỔNG CHI PHÍ</th>}<th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{eligible.map(c=><tr key={c.id}><td><b>{c.brand} {c.model}</b><small>{c.plate} · {c.id}</small></td><td>{c.maintenance.length}</td>{user.role==='ADMIN'&&<td><b>{money(c.maintenance.reduce((s,m)=>s+Number(m.amount),0))}</b></td>}<td><span className={`status status-${c.status.toLowerCase()}`}>{c.status==='MAINTENANCE'?'Đang bảo dưỡng':'Đã chốt / tiếp tục quy trình'}</span></td><td><div className="table-actions"><button className="btn btn-outline btn-sm" onClick={()=>setExpanded(expanded===c.id?null:c.id)}>Lịch sử & hóa đơn</button>{c.status==='MAINTENANCE'&&<button className="btn btn-primary btn-sm" onClick={()=>{setCarId(c.id);setError('')}}>＋ Thêm chi phí</button>}{user.role==='ADMIN'&&c.status==='MAINTENANCE'&&<button disabled={busy} className="btn btn-outline btn-sm" onClick={()=>complete(c)}>Chốt bảo dưỡng</button>}</div></td></tr>)}</tbody></table>{eligible.length===0&&<div className="empty">Chưa có xe được chuyển sang bảo dưỡng.</div>}</div></div>
    {expanded&&<div className="panel maintenance-history"><div className="panel-head"><div><h3>Lịch sử bảo dưỡng · {cars.find(c=>c.id===expanded)?.plate}</h3><p>Ghi nhận theo thời gian, nhân viên và hóa đơn đính kèm.</p></div><button className="btn btn-outline btn-sm" onClick={()=>setExpanded(null)}>Đóng lịch sử</button></div>
      {(cars.find(c=>c.id===expanded)?.maintenance||[]).map(r=><div key={r.id} className="maintenance-history-row"><div><b>{r.task}</b><small>{fmt(r.date)} · {r.employee?.name||'Nhân viên'}</small><p>{r.note||'Không có ghi chú'}</p></div><div>{user.role==='ADMIN'&&<b>{money(r.amount)}</b>}<div className="invoice-buttons">{r.invoices.map(i=><button key={i.id} type="button" className="btn btn-outline btn-sm" onClick={()=>setViewer(i)}>Xem {i.originalName||'hóa đơn'}</button>)}{cars.find(c=>c.id===expanded)?.status==='MAINTENANCE'&&(user.role==='ADMIN'||r.assignedTo===user.id)&&<label className="btn btn-outline btn-sm" style={{cursor:'pointer'}}>＋ Hóa đơn<input hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)uploadInvoice(r.id,f);e.target.value=''}}/></label>}</div></div></div>)}
      {!cars.find(c=>c.id===expanded)?.maintenance.length&&<div className="empty">Chưa có chi phí bảo dưỡng.</div>}
    </div>}
    {selected&&<Modal title="Thêm hạng mục / chi phí bảo dưỡng" subtitle={`${selected.brand} ${selected.model} · ${selected.plate}`} onClose={()=>setCarId(null)}>
      {error&&<div className="error-text">{error}</div>}
      <div className="field"><label>Hạng mục bảo dưỡng *</label><input value={task} onChange={e=>setTask(e.target.value)} placeholder="Thay nhớt, thay lốp, làm đồng..."/></div>
      <div className="field"><label>Chi phí (VNĐ) *</label><input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
      <div className="field"><label>Ghi chú công việc</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}/></div>
      <div className="field"><label>Đính kèm nhiều hóa đơn PDF / ảnh</label><input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFiles(Array.from(e.target.files||[]))}/><small>{files.length?`${files.length} file đã chọn`:'Có thể bổ sung hóa đơn vào lịch sử sau khi lưu.'}</small></div>
      <div className="notice">Chi phí được ghi nhận riêng từng lần, không ghi đè các khoản trước. Admin xem người tạo, thời gian và hóa đơn.</div>
      <div className="modal-actions"><button className="btn btn-outline" onClick={()=>setCarId(null)}>Hủy</button><button disabled={busy} className="btn btn-primary" onClick={add}>{busy?'Đang lưu...':'Lưu chi phí'}</button></div>
    </Modal>}
    {viewer&&<SecureInvoiceViewer invoice={viewer} onClose={()=>setViewer(null)}/>}
  </div>;
}
