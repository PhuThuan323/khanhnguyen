# Garage OS — Used Car Garage Management

Bản chuyển đổi từ phần mềm quản lý kho gốm sang quản lý vòng đời xe ô tô đã qua sử dụng. Frontend được tách theo feature và có dữ liệu demo lưu tại LocalStorage để có thể chạy ngay trên máy local mà không cần cấu hình database.

## Yêu cầu
- Node.js 20.19+ hoặc 22.12+
- npm

## Chạy frontend
```bash
cd frontend
npm install
npm run dev
```
Mở http://localhost:5173

## Tài khoản demo
| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | admin@garage.local | admin123 |
| Nhân viên | an@garage.local | 123456 |
| Nhân viên | binh@garage.local | 123456 |

## Feature đã triển khai
- Dashboard: số lượng xe, vốn xe, xe đang bán, xe đặt cọc, chi phí vận hành.
- Tiếp nhận & kiểm định: hồ sơ xe, người bán, giá thu mua, 6 nhóm kiểm định.
- Bảo dưỡng: phân công nhân viên, hạng mục, chi phí, chứng từ demo, chốt bảo dưỡng.
- Kho xe & định giá: tổng hợp giá mua + bảo dưỡng; Admin duyệt giá bán.
- Kinh doanh: khách hàng, TikTok, số điện thoại, địa chỉ, lịch sử tư vấn, trạng thái khách chốt, Admin xác nhận cọc.
- Chi phí vận hành: xăng dầu, ăn uống, vận hành garage, điện nước, internet và các khoản khác.
- Bảo hành & hậu mãi: gắn chi phí vào hồ sơ xe, tra cứu theo mã hồ sơ.
- Nhân sự: tạo/xóa tài khoản demo và phân vai trò.

## Cấu trúc feature
```
src/
  components/       # Sidebar, Topbar, Modal
  features/
    dashboard/
    inspection/
    maintenance/
    inventory/
    sales/
    expenses/
    warranty/
    users/
  lib/              # Seed data, LocalStorage, format helpers
```

## Lưu ý phạm vi bản demo
- Dữ liệu chỉ nằm trong LocalStorage của trình duyệt hiện tại; chưa có database, API backend, đồng bộ đa máy hay đăng nhập bảo mật thật.
- Ảnh kiểm định và hóa đơn được lưu dạng Data URL trong LocalStorage để test trên trình duyệt (ảnh tối đa 500 KB/file, hóa đơn tối đa 1 MB/file). Dữ liệu không được đồng bộ giữa máy và có thể chạm giới hạn dung lượng trình duyệt; production cần API/object storage.
- Tích hợp Zalo OA gửi lịch bảo dưỡng và TikTok API chưa được kết nối; cần tài khoản/app được cấp quyền và cấu hình callback/token.
- Đây là nền tảng prototype nghiệp vụ để review UI/flow trước khi triển khai backend production.

## Build kiểm tra
```bash
npm run build
```

## Source backend cũ

Thư mục `legacy/backend-gom-cu` được giữ lại để tham khảo source backend quản lý kho gốm ban đầu. Backend này chưa được chuyển đổi sang nghiệp vụ xe và không được frontend demo sử dụng. Không chạy backend cũ cho bản Garage OS này.
