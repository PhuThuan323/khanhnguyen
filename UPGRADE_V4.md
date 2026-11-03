# Garage OS V4 — Kiểm định, bán xe, lịch sử người mua, báo cáo tài chính

## Phạm vi nâng cấp từ V3

- Sidebar cố định bên trái được bổ sung thanh cuộn dọc trên màn hình desktop; danh sách menu chỉ hiện theo `user.role`.
- Kinh doanh: danh sách tất cả khách quan tâm theo xe, nhật ký cuộc gọi/tin nhắn/xem xe/chăm sóc, chọn một khách đặt cọc, lưu nhiều khoản thanh toán và chốt bán. Xe đã bán giữ hồ sơ người mua, lịch sử cọc và các khoản thanh toán.
- Một xe chỉ có một hồ sơ đặt cọc được xác nhận: ràng buộc duy nhất `CarDeal.carId` ở PostgreSQL cùng kiểm tra cập nhật trạng thái xe theo điều kiện trong transaction.
- Chỉ Admin có thể đặt cọc, thu tiền, chốt bán; không cho `PATCH /api/cars/:id` để nhảy thẳng trạng thái `DEPOSITED` / `SOLD`.
- Báo cáo tài chính tuần / tháng cho Admin: doanh thu đã bán, tiền thực nhận, giá vốn xe đã bán, chi phí trong kỳ, lợi nhuận/dòng tiền ước tính và danh sách xe bán/thanh toán.
- Bảo vệ dữ liệu vốn trên API: nhân viên không nhận `purchasePrice`, `seller`, `phone`, `salePrice`, `deposit`, `deal`, `leads`, `warranty`, tổng giá vốn hay chi phí của các nhân viên khác. Với chi phí bảo dưỡng do nhân viên nhập, API lưu số tiền nhưng không trả lại giá trị trong dữ liệu đọc dành cho nhân viên.
- Ảnh kiểm định và ghi chú bị khóa sau khi Admin chốt kiểm định; vẫn có thể xem lịch sử.

## Hướng dẫn chạy V4 độc lập, không đụng V2 / V3

1. Giải nén vào thư mục MỚI, không ghi đè project V2/V3. Dùng một Supabase project/database V4 TEST riêng. Nếu cần dữ liệu mẫu của V3, hãy sử dụng bản sao DB đã sao lưu, không kết nối V4 test tới database production.
2. Tạo `backend/.env` từ `backend/.env.example` với kết nối PostgreSQL hợp lệ của database V4 test; dùng Cloudinary Cloud Name thật và Google OAuth Client ID đã đăng ký localhost.
3. Tại `backend`, chạy:

```powershell
npm ci
npx prisma validate
npx prisma generate
npx prisma db push
npm test
npm run dev
```

`db push` chỉ nên dùng trên database development/test do bạn kiểm soát. **Không chạy `db push --accept-data-loss`**, không dùng `migrate reset` trên database thật. Đối với production có dữ liệu, cần sao lưu, chuẩn bị migration có kiểm tra schema drift và thử trên bản sao trước khi merge/triển khai.

4. Tại `frontend`, tạo `.env` dựa trên `.env.example`, sau đó:

```powershell
npm ci
npm run dev -- --port 5175 --strictPort
```

Để chạy đồng thời với V2, dùng backend `PORT=8082`, `FRONTEND_URL=http://localhost:5175` và `VITE_API_URL=http://localhost:8082/api`. Đăng ký origin `http://localhost:5175` trong Google OAuth Web Client.

## Bảng dữ liệu mới

- `LeadActivity`: lịch sử quan tâm / gọi điện / trao đổi / đến xem xe; có người nhập, thời điểm, loại tương tác.
- `CarDeal`: một hồ sơ giao dịch cho mỗi xe, lưu khách đặt cọc, giá thống nhất, ngày đặt cọc và ngày bán. Liên kết tới `SalesLead`.
- `SalePayment`: nhiều lần thu tiền, phân biệt `DEPOSIT` và `BALANCE`, có người nhập, thời gian và nội dung.

Các bảng hiện có không bị đổi tên. Trạng thái `DEPOSITED`/`SOLD` cũ không tự gán vào `CarDeal` để tránh bịa thông tin người mua. **Xe đã nhận cọc/đã bán trước V4** cần đối soát và chuyển dữ liệu theo chứng từ gốc nếu muốn đưa vào báo cáo chính xác.

## Quy trình kinh doanh mới

1. Admin hoàn tất bảo dưỡng và duyệt giá bán → `FOR_SALE`.
2. Admin vào **Kinh doanh**, mở xe, lưu mọi khách quan tâm và lịch sử trao đổi. Có thể đánh dấu một khách "Chốt tư vấn".
3. Admin chọn đúng khách → **Xác nhận cọc**. Hệ thống tạo một `CarDeal` duy nhất cho xe; trạng thái thành `DEPOSITED`.
4. Admin thu thêm tiền qua **Ghi nhận thanh toán**, cho tới khi đủ giá đã thống nhất. Mọi khoản thu không được vượt quá số còn thiếu; không ghi đè lịch sử cọc.
5. Khi đã nhận đủ tiền, Admin bấm **Xác nhận đã bán** → trạng thái `SOLD`, lưu người mua cuối cùng và thời gian bán.

V4 chưa cung cấp chức năng hủy cọc/chuyển người cọc/hoàn tiền nhằm tránh làm sai dữ liệu kế toán và lịch sử người mua. Những nghiệp vụ đó cần thiết kế phê duyệt và ghi nhận hoàn tiền riêng trước khi đưa vào sử dụng.

## Định nghĩa báo cáo

- **Doanh thu bán xe**: tổng giá thỏa thuận (`CarDeal.agreedPrice`) của các xe **chốt bán** trong kỳ. Không cộng tiền cọc thêm lần nữa vào doanh thu.
- **Tiền thực nhận**: tổng `SalePayment` nhận trong kỳ (cọc + thanh toán), có thể khác doanh thu cùng kỳ.
- **Giá vốn xe đã bán**: giá mua + bảo dưỡng của các xe chốt bán trong kỳ (không cộng chi xe tồn kho vào giá vốn bán hàng).
- **Dòng tiền tạm tính**: tiền thực nhận trừ chi mua xe, bảo dưỡng, vận hành và bảo hành ghi nhận trong kỳ.
- **Lợi nhuận tạm tính**: doanh thu bán xe trừ giá vốn xe bán, chi phí vận hành và bảo hành trong kỳ. Không phải báo cáo kế toán đã kiểm toán.
- Múi giờ kỳ: `Asia/Ho_Chi_Minh`, tuần từ Thứ Hai đến Chủ nhật, tháng theo lịch Việt Nam.
- Chi mua xe dùng **ngày tạo hồ sơ** vì chưa có trường riêng cho ngày chi tiền mua xe. Thuế, tiền lương, lãi vay, công nợ và khoản chi chưa nhập không được suy đoán.

## Bảo mật quan trọng

- Các route `/api/sales`, `/api/reports`, `/api/operations` đều yêu cầu `ADMIN` tại backend.
- Nhân viên chỉ truy cập xe đã được gán; không gửi dữ liệu thu mua/vốn/sales trong phản hồi của `/api/cars`.
- Hóa đơn bảo dưỡng do nhân viên khác tải lên không thể truy cập bằng tài khoản nhân viên không phải tác giả.
- Đã tách file `.env` khỏi bản ZIP. **Không commit secret key, database URL có mật khẩu hay node_modules lên GitHub.** Thay các khóa đã từng được chia sẻ.

## Kiểm thử trước khi merge vào production

- Trên database V4 TEST, thử 2 Admin cùng xác nhận cọc 1 xe cùng lúc → chỉ một yêu cầu được chấp nhận.
- Một khách cọc, thử khách thứ hai cọc → nhận HTTP 409.
- Thử `PATCH /api/cars/:id` trực tiếp lên `SOLD`/`DEPOSITED` → HTTP 400.
- Thanh toán thấp hơn giá xe → không được chốt đã bán; thanh toán đủ → chốt được và giữ buyer.
- Đăng nhập employee, kiểm tra network Response của `/api/cars` không có `purchasePrice`, `deal`, `salePrice`, số tiền bảo dưỡng, người bán, báo cáo.
- Employee gọi trực tiếp `/api/reports/finance` → HTTP 403.
- So sánh báo cáo tuần/tháng với hóa đơn và ngày thanh toán thực tế.
- Kiểm tra ảnh Cloudinary, Google OAuth và Prisma schema trên hạ tầng thật trước deploy.

## Trạng thái kiểm thử trong môi trường tạo mã

- JavaScript backend: đã qua kiểm tra cú pháp Node.js.
- React/JSX: đã qua kiểm tra cú pháp bằng TypeScript parser.
- `node --test test/*.test.js`: 8/8 đạt (logic/DTO/định dạng).
- **Chưa kiểm thử tích hợp với PostgreSQL thật, chưa xác nhận Prisma migration, chưa chạy browser end-to-end**, do môi trường thiếu Prisma Engine Linux và không tải được gói npm. Cần xác minh những bước này trên máy của bạn.
