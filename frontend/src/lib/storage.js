// Định dạng hiển thị; dữ liệu nghiệp vụ phải lấy từ backend, không lưu LocalStorage.
export const money=(n=0)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(n)||0);
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const statusText={INSPECTION:'Chờ kiểm định',MAINTENANCE:'Đang bảo dưỡng',READY_FOR_REVIEW:'Chờ duyệt giá',FOR_SALE:'Đang bán',CUSTOMER_CLOSED:'Khách đã chốt',DEPOSITED:'Đã đặt cọc',SOLD:'Đã bán',CANCELLED:'Đã hủy'};

export const vnDate=(value)=>{if(!value)return "";const d=new Date(value);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
