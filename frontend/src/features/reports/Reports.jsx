import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { money } from '../../lib/storage';
const localDate = () => { const parts=new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const get=t=>parts.find(p=>p.type===t)?.value; return `${get('year')}-${get('month')}-${get('day')}`; };
const date = d => d ? new Date(d).toLocaleString('vi-VN') : '—';

const cards = [
  ['salesRevenue','Doanh thu xe đã bán','Ghi nhận theo ngày chốt bán'],
  ['receipts','Tiền thực nhận','Bao gồm cọc và thanh toán trong kỳ'],
  ['costOfCarsSold','Giá vốn xe đã bán','Giá mua + bảo dưỡng của xe đã bán'],
  ['estimatedProfit','Lợi nhuận tạm tính','Chưa gồm thuế, lương và chi phí chưa nhập'],
  ['purchaseCashOut','Chi mua xe trong kỳ','Dựa trên ngày tiếp nhận hồ sơ xe'],
  ['maintenanceCashOut','Chi bảo dưỡng trong kỳ','Tất cả xe, kể cả chưa bán'],
  ['operatingExpenses','Chi phí vận hành','Theo ngày chi phí đã nhập'],
  ['warrantyExpenses','Chi phí hậu mãi','Theo ngày bảo hành đã nhập'],
  ['totalCashOut','Tổng chi ghi nhận','Chi mua xe + bảo dưỡng + vận hành + bảo hành'],
  ['estimatedCashFlow','Dòng tiền tạm tính','Tiền thu trừ tổng chi trong kỳ'],
];
export default function Reports() {
  const [period,setPeriod] = useState('month');
  const [anchor,setAnchor] = useState(localDate());
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [refresh,setRefresh] = useState(0);
  useEffect(() => {
    setLoading(true); setError(''); setData(null);
    // API helper doesn't yet expose signal to all screens; this page uses a guarded promise.
    let active = true;
    api(`/reports/finance?period=${encodeURIComponent(period)}&anchor=${encodeURIComponent(anchor)}`)
      .then(res => { if (active) setData(res); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period,anchor,refresh]);
  return <div className="page-content finance-v4">
    <div className="page-toolbar"><div><div className="eyebrow">MANAGEMENT REPORTS · ADMIN ONLY</div><h2>Báo cáo tài chính</h2><p>Báo cáo tuần / tháng theo múi giờ Việt Nam. Dữ liệu tài chính chỉ gửi tới tài khoản Admin.</p></div></div>
    <div className="panel finance-controls"><div className="report-filters"><div className="field"><label>Kỳ báo cáo</label><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="week">Theo tuần (Thứ 2 – Chủ nhật)</option><option value="month">Theo tháng</option></select></div><div className="field"><label>Chọn ngày trong kỳ</label><input type="date" value={anchor} onChange={e=>setAnchor(e.target.value)}/></div><button className="btn btn-outline" onClick={()=>setRefresh(n=>n+1)} disabled={loading}>↻ Làm mới</button></div>
      {data&&<div className="report-range">Từ <b>{data.range.startDate}</b> đến trước <b>{data.range.endDateExclusive}</b> · Múi giờ Asia/Ho_Chi_Minh</div>}
    </div>
    {loading&&<div className="empty">Đang tải báo cáo...</div>}
    {error&&<div className="app-error inline-error">{error}</div>}
    {data&&<>
      <div className="finance-stats">{cards.map(([key,label,subtitle])=><div className={`finance-stat ${['estimatedProfit','estimatedCashFlow'].includes(key)?'finance-highlight':''}`} key={key}><small>{label}</small><strong>{money(data.summary[key])}</strong><span>{subtitle}</span></div>)}</div>
      <div className="report-panels">
        <div className="panel"><div className="panel-head"><div><h3>Xe xác nhận bán trong kỳ</h3><p>{data.summary.soldCount} xe đã có hồ sơ người mua</p></div></div><div className="table-wrap"><table><thead><tr><th>XE</th><th>NGƯỜI MUA</th><th>NGÀY BÁN</th><th>GIÁ BÁN</th><th>GIÁ VỐN</th><th>LÃI GỘP TẠM TÍNH</th></tr></thead><tbody>{data.soldCars.map(c=><tr key={c.carId}><td><b>{c.plate}</b><small>{c.vehicle}</small></td><td>{c.buyer}</td><td>{date(c.soldAt)}</td><td>{money(c.revenue)}</td><td>{money(c.cost)}</td><td><b>{money(c.revenue-c.cost)}</b></td></tr>)}</tbody></table>{!data.soldCars.length&&<div className="empty empty-inline">Chưa có xe chốt bán trong kỳ.</div>}</div></div>
        <div className="panel"><div className="panel-head"><div><h3>Dòng tiền thực nhận</h3><p>Liệt kê các khoản cọc và thanh toán phát sinh trong kỳ</p></div></div><div className="table-wrap"><table><thead><tr><th>NGÀY THU</th><th>XE</th><th>KHÁCH</th><th>LOẠI THU</th><th>SỐ TIỀN</th></tr></thead><tbody>{data.paymentHistory.map(p=><tr key={p.id}><td>{date(p.receivedAt)}</td><td>{p.car}</td><td>{p.buyer}</td><td>{p.kind==='DEPOSIT'?'Cọc':'Thanh toán'}</td><td><b>{money(p.amount)}</b></td></tr>)}</tbody></table>{!data.paymentHistory.length&&<div className="empty empty-inline">Chưa phát sinh thu tiền trong kỳ.</div>}</div></div>
      </div>
      <div className="panel finance-explanation"><h3>Nguyên tắc báo cáo</h3><p>Doanh thu chỉ ghi nhận khi Admin xác nhận bán xe. Tiền cọc được tính trong dòng tiền thực nhận, không cộng thêm một lần vào doanh thu bán xe. Giá vốn xe đã bán gồm giá thu mua và bảo dưỡng; chi bảo dưỡng xe chưa bán được theo dõi là dòng tiền chi, không trừ hai lần trong lợi nhuận.</p><p>Lợi nhuận là ước tính quản trị dựa trên dữ liệu đã nhập, chưa bao gồm thuế, phí tài chính và các chi phí chưa ghi nhận. Chi mua xe được phân kỳ theo ngày tạo hồ sơ vì hệ thống V3 chưa có trường ngày chi trả thu mua độc lập.</p>{data.summary.legacySoldCount>0&&<p className="report-warning">Có {data.summary.legacySoldCount} xe trạng thái Đã bán từ phiên bản cũ nhưng chưa có hồ sơ giao dịch mới. Các xe này chưa được đưa vào số liệu doanh thu/lợi nhuận theo giao dịch V4; cần đối soát và bổ sung dữ liệu lịch sử.</p>}</div>
    </>}
  </div>;
}
