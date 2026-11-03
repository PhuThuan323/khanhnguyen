# GARAGE OS V4 — nâng cấp từ V3

**Hướng dẫn cấu hình, thay đổi schema và kiểm thử:** xem [UPGRADE_V4.md](UPGRADE_V4.md).

Phần kiểm định V3 được giữ lại; V4 bổ sung thanh cuộn sidebar, CRM khách quan tâm/cọc/thanh toán/lưu khách mua, báo cáo tài chính tuần/tháng và bảo mật dữ liệu vốn dành riêng cho Admin.

---

# Garage OS — React + Node.js API

Bản cập nhật triển khai từ mã nguồn `garage-work.zip` (03/11/2026). Frontend và backend tách độc lập. **Không phải bản đang triển khai trên máy chủ của người dùng.** Muốn dùng online cần tự cấu hình Google Cloud, Cloudinary, PostgreSQL và chạy migration.

## 1. Kiến trúc

```text
Garage OS
├── frontend/                 React 19 + Vite (giữ giao diện/tech stack gốc)
│   ├── src/features/        Kiểm định, bảo dưỡng, kho xe, sales, chi phí, bảo hành, nhân sự
│   ├── src/components/      Xem ảnh/hóa đơn trực tiếp bằng overlay
│   └── src/lib/api.js       Fetch REST API + Bearer token
├── backend/                  Node.js + Express 5
│   ├── src/routes/          REST API có phân quyền
│   ├── src/middleware/      Xác thực JWT, kiểm tra file
│   ├── src/services/        Cloudinary, DTO bảo mật
│   ├── prisma/schema.prisma PostgreSQL schema
│   └── test/                Unit tests
└── docker-compose.yml        PostgreSQL chạy local
```

**Nguồn dữ liệu:** PostgreSQL lưu xe, hồ sơ kiểm định, phân công, bình luận, danh sách ảnh, bảo dưỡng, hóa đơn, nhân viên, khách hàng, chi phí vận hành và bảo hành. Ảnh và hóa đơn được tải lên Cloudinary với `type: authenticated`; frontend tải ảnh/chứng từ qua `/api/media/...` có kiểm tra JWT và quyền trên xe. Không gửi khóa Cloudinary xuống browser.

**Vai trò:** Admin tạo xe, xem giá/đầu mối bán, duyệt điều kiện kiểm định, phân công nhiều nhân viên, xem lịch sử bảo dưỡng/hóa đơn, quản trị nhân viên, chốt bảo dưỡng và kinh doanh. Employee chỉ thấy xe được phân công và có thể thêm ảnh/nhận xét kiểm định, xóa hoặc thay ảnh mình đã upload; trong quy trình bảo dưỡng cũng được thêm nhiều chi phí/hóa đơn cho xe được giao. Nhân viên không được sửa kết luận kiểm định, giá thu mua, người bán, giao quyền hoặc tạo hồ sơ xe.

## 2. Cấu hình một lần

Yêu cầu Node.js 22.12+ (hoặc 20.19+), npm, Docker Desktop / PostgreSQL 16, tài khoản Google Cloud, tài khoản Cloudinary. Máy cài đặt phải có Internet để tải dependency/Prisma Engine.

### Bước 1: Tạo Google OAuth Client ID

1. Vào [Google Cloud Console](https://console.cloud.google.com/apis/credentials), tạo project và cấu hình OAuth consent screen.
2. Tạo OAuth Client ID, loại **Web application**.
3. Trong **Authorized JavaScript origins**, thêm `http://localhost:5173` và domain frontend HTTPS khi deploy.
4. Copy **Client ID** (`*.apps.googleusercontent.com`) vào `GOOGLE_CLIENT_ID` (backend) và `VITE_GOOGLE_CLIENT_ID` (frontend), phải giống nhau.
5. Cấu hình OAuth consent screen và thêm tài khoản thử nghiệm vào **Test users** nếu app ở chế độ Testing.
6. Email Admin ban đầu phải là tài khoản Google thực tế, đúng email đã xác minh; khai báo `ADMIN_EMAILS` trên backend (có thể nhiều email ngăn cách dấu phẩy). **Không nhập tài khoản demo `admin@garage.local`.**

Ứng dụng dùng Google Identity Services và backend `google-auth-library` để xác minh Google ID token. Không cần lưu mật khẩu nhân viên. Các tài khoản mới không nằm trong `ADMIN_EMAILS` phải được Admin mời trước ở trang **Nhân sự**.

### Bước 2: Cloudinary

Trong [Cloudinary Console](https://console.cloudinary.com/), lấy Cloud Name, API Key, API Secret. Điền **chỉ trên backend**. Ảnh kiểm định nhận JPG/PNG/WEBP; hóa đơn JPG/PNG/WEBP/PDF; file tối đa 10 MB theo mặc định (có thể chỉnh `MAX_UPLOAD_MB`). Asset được upload ở chế độ `authenticated`, lấy qua backend, không cung cấp URL Cloudinary public trong JSON.

### Bước 3: PostgreSQL + biến môi trường

Từ thư mục gốc:

```bash
docker compose up -d
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Trên Windows PowerShell: dùng `Copy-Item backend/.env.example backend/.env` và `Copy-Item frontend/.env.example frontend/.env`.

Trong `backend/.env` thay:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/garage_os?schema=public
JWT_SECRET=<tạo chuỗi ngẫu nhiên dài tối thiểu 64 ký tự>
GOOGLE_CLIENT_ID=<Google-Web-Client-ID>
ADMIN_EMAILS=<email-google-admin-của-bạn>
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
FRONTEND_URL=http://localhost:5173
```

Trường hợp thay `POSTGRES_PASSWORD` ở Docker Compose, phải cập nhật `DATABASE_URL` tương ứng (đồng thời xóa volume cũ nếu đây là môi trường demo mới; **không xóa volume có dữ liệu thật**).

Trong `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=<cùng Google-Web-Client-ID>
```

### Bước 4: Cài dependency và tạo bảng

Terminal 1:

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate dev --name init
npm run test
npm run dev
```

**Lưu ý:** ZIP không chứa migration đã chạy trước đó. `migrate dev --name init` sẽ tạo migration ban đầu trên PostgreSQL mới; hãy commit thư mục `prisma/migrations` được tạo trước khi deploy production. Trên production: `npx prisma migrate deploy` với migration đã được kiểm thử.

Terminal 2:

```bash
cd frontend
npm ci
npm run dev
```

Mở `http://localhost:5173`. Kiểm tra API `http://localhost:8080/api/health`.

## 3. Kịch bản kiểm thử nghiệp vụ

1. Admin đăng nhập Google đúng email đã khai báo; tạo xe mới tại **Kiểm định xe**. Giá thu mua và thông tin người bán chỉ hiện cho Admin.
2. Admin mời **hai nhân viên** tại trang **Nhân sự**, sau đó mở hồ sơ xe và chọn cả hai ở phần phân công; bấm **Lưu phân công**.
3. Nhân viên A đăng nhập Google được mời: chỉ thấy xe đã được giao. Nhân viên B cũng có thể truy cập cùng xe. Nhân viên khác chưa được giao không thấy xe và sẽ nhận HTTP 404 khi gọi API trực tiếp.
4. Nhân viên A tải nhiều ảnh vào từng block, bấm thumbnail để phóng to nội bộ, chọn **Thay** hoặc **Xóa** ảnh mình tải. Nhân viên B không được xóa ảnh của A; Admin có thể quản lý tất cả.
5. A và B thêm nhận xét ở từng block. Admin xem lịch sử bình luận với tên người ghi và thời gian.
6. Admin chọn kết luận kiểm định và **Hoàn tất kiểm định**; xe chuyển sang **Đang bảo dưỡng**.
7. A thêm hạng mục/chi phí bảo dưỡng thứ nhất, sau đó thêm hạng mục thứ hai, tải nhiều hóa đơn PDF/ảnh. B có thể thêm một hạng mục khác trên cùng xe.
8. Admin vào **Bảo dưỡng > Lịch sử & hóa đơn** để xem từng khoản, người tạo, thời gian, số tiền và mở chứng từ trong trình duyệt. Admin chốt bảo dưỡng, sau đó duyệt giá bán ở **Kho xe & định giá**.
9. Admin xem khách hàng/đặt cọc, chi phí vận hành, bảo hành từ PostgreSQL qua frontend.

## 4. REST API

Tất cả trừ `GET /api/health` và `POST /api/auth/google` đều yêu cầu `Authorization: Bearer <JWT>`.

| Method | Endpoint | Quyền |
|---|---|---|
| POST | `/api/auth/google` | Google ID token, chỉ email được mời/Admin bootstrap |
| GET | `/api/auth/me` | User đã đăng nhập |
| GET | `/api/cars` | Admin tất cả; nhân viên chỉ xe được giao; DTO ẩn dữ liệu nhạy cảm |
| GET | `/api/cars/:id` | Theo quyền xe |
| POST | `/api/cars` | Admin tạo xe |
| PATCH | `/api/cars/:id` | Admin cập nhật tình trạng/giá bán/cọc |
| PUT | `/api/cars/:id/assignments` | Admin phân công nhiều employeeIds |
| PUT | `/api/inspection/cars/:id/blocks/:section` | Admin kết luận hạng mục |
| POST | `/api/inspection/cars/:id/blocks/:section/comments` | Theo quyền xe; lưu tác giả |
| POST | `/api/inspection/cars/:id/blocks/:section/photos` | Theo quyền xe; upload Cloudinary |
| PUT | `/api/inspection/photos/:id` | Admin hoặc người upload thay ảnh |
| DELETE | `/api/inspection/photos/:id` | Admin hoặc người upload xóa ảnh |
| PUT | `/api/inspection/cars/:id/complete` | Admin chốt kiểm định |
| GET, POST | `/api/maintenance/cars/:id` | Theo quyền xe; thêm nhiều chi phí |
| POST | `/api/maintenance/:recordId/invoices` | Thêm hóa đơn cho chi phí do mình tạo hoặc Admin |
| PUT | `/api/maintenance/cars/:id/complete` | Admin chốt bảo dưỡng |
| GET | `/api/maintenance/admin/history/:id` | Admin xem lịch sử đầy đủ |
| GET | `/api/media/photos/:id` | Proxy ảnh bảo vệ bằng quyền xe |
| GET | `/api/media/invoices/:id` | Proxy hóa đơn bảo vệ bằng quyền xe |
| GET, POST | `/api/users` | Admin quản lý nhân viên |
| PATCH | `/api/users/:id` | Admin sửa vai trò/khóa tài khoản |
| POST | `/api/cars/:id/leads` | Admin thêm khách quan tâm |
| GET, POST | `/api/operations/expenses` | Admin chi phí vận hành |
| GET, POST | `/api/operations/warranty` | Admin bảo hành |
| GET | `/api/operations/cars/:id/audit` | Admin nhật ký thay đổi xe |

## 5. Kiểm tra, giới hạn và vận hành production

- Đã xác thực cú pháp toàn bộ JavaScript/JSX và chạy `backend/test/permissions.test.js` (kiểm tra ẩn dữ liệu, tác giả, magic bytes). **Chưa thể chạy build Vite đầy đủ, Prisma migration hoặc E2E với Google/Cloudinary/PostgreSQL thật** trong môi trường tạo gói vì không tải được dependency và Prisma Engine Linux. Cần chạy các bước ở mục 2 trên môi trường có Internet trước khi vận hành thực tế.
- Backend có rate limit cho login, kiểm tra MIME bằng magic bytes, giới hạn dung lượng và quyền trên từng xe. Session JWT được lưu `sessionStorage`, không lưu ảnh hay giá thu mua vào LocalStorage. Để bảo mật cao hơn trên môi trường production, có thể chuyển sang cookie `HttpOnly/SameSite` + CSRF protection và bổ sung giám sát sự kiện đăng nhập.
- File Cloudinary dạng `authenticated`, nhưng bản thân một signed URL có thể được chia sẻ trong thời gian còn hiệu lực. Giao diện dùng API proxy để không lộ signed URL trực tiếp. Hãy đặt HTTPS, CORS domain thật, sao lưu PostgreSQL và theo dõi hóa đơn/chi phí Cloudinary.
- Bản ZIP gốc có dữ liệu LocalStorage mẫu; bản mới **không tự động import** dữ liệu từ browser hoặc DB cũ. Nếu có dữ liệu thật trên bản cũ, cần script chuyển đổi/đối chiếu riêng trước khi thay thế hệ thống đang chạy.
- Nếu một file hóa đơn được upload lỗi sau khi khoản chi đã tạo, khoản chi vẫn được lưu. Mở lại lịch sử để tải bù; không bấm thêm khoản chi trùng.
- Không đưa `.env`, API Secret, khóa Cloudinary, client secret Google hoặc `node_modules` lên Git và không chia sẻ ZIP có thông tin bí mật.

Tài liệu tham khảo: [Google verify ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [Cloudinary authenticated assets](https://cloudinary.com/documentation/control_access_to_media).
