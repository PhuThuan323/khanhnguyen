import { useEffect, useState } from 'react';
import { getProtectedFile } from '../lib/api';
export function useProtectedMedia(path){
  const [state,setState]=useState({src:'',error:''});
  useEffect(()=>{
    const controller=new AbortController();let src='';
    setState({src:'',error:''});
    getProtectedFile(path,controller.signal).then(url=>{
      src=url;if(!controller.signal.aborted)setState({src:url,error:''});else URL.revokeObjectURL(url);
    }).catch(e=>{if(!controller.signal.aborted)setState({src:'',error:e.message})});
    return ()=>{controller.abort();if(src)URL.revokeObjectURL(src)};
  },[path]);
  return state;
}
export function SecurePhoto({photo,onPreview,onReplace,onDelete,editable}) {
  const {src,error}=useProtectedMedia(`/media/photos/${photo.id}`);
  return <div className="secure-photo">
    <button type="button" title="Xem ảnh trong trình duyệt" className="photo-click" onClick={()=>src&&onPreview({src,name:photo.originalName||'Ảnh kiểm định'})}>
      {src?<img src={src} alt={photo.originalName||'Ảnh kiểm định'}/>:<span>{error||'Đang tải ảnh...'}</span>}
    </button>
    {editable&&<div className="photo-tools">
      <label title="Thay ảnh">Thay<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)onReplace(f);e.target.value=''}}/></label>
      <button type="button" title="Xóa ảnh" onClick={onDelete}>Xóa</button>
    </div>}
    <small>{photo.uploadedBy?.name||'Nhân viên'}</small>
  </div>
}
export function SecureInvoiceViewer({invoice,onClose}) {
  const {src,error}=useProtectedMedia(`/media/invoices/${invoice.id}`);
  return <div className="media-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()} role="dialog" aria-label="Xem hóa đơn bảo dưỡng">
    <button className="media-close" onClick={onClose} aria-label="Đóng">×</button>
    <div className="invoice-overlay-content"><h3>{invoice.originalName||'Chứng từ bảo dưỡng'}</h3>
      {error?<p>{error}</p>:!src?<p>Đang tải chứng từ…</p>:invoice.format==='pdf'?<iframe title="Hóa đơn PDF" src={src}/>:<img src={src} alt="Hóa đơn"/>}
    </div>
  </div>
}
