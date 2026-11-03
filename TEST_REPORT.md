# Báo cáo kiểm tra mã nguồn Garage OS (03/11/2026)

## Đã thực hiện

- Kiểm tra cấu trúc ZIP gốc và xác định mismatch giữa frontend LocalStorage / backend Prisma schema / API.
- Sửa tương thích field và relation API theo Prisma schema mới.
- Kiểm tra cú pháp **31 tệp** JavaScript/JSX bằng TypeScript parser; **0 lỗi parse**.
- Kiểm tra cú pháp `node --check` backend: hoàn tất không có lỗi.
- Chạy `node --test backend/test/*.test.js`: **3/3 test PASS**.
  - DTO của nhân viên không chứa giá thu mua, tên, điện thoại người bán hay publicId Cloudinary.
  - DTO của Admin có thông tin thu mua, nhận xét kèm tác giả, hóa đơn.
  - Nhận diện file theo magic bytes JPG/PDF và từ chối file GIF trong tập hỗ trợ hiện tại.
- Soát cấu hình: ZIP đầu ra không chứa `backend/.env.production` từ ZIP gốc, không chứa node_modules hay secret môi trường.

## Chưa kiểm tra được trong môi trường thực thi hiện tại

- `npm ci` gặp lỗi DNS `EAI_AGAIN` khi truy cập registry.npmjs.org, nên **chưa chạy build Vite production**.
- Prisma CLI tìm `schema-engine-debian-openssl-3.0.x` trên binaries.prisma.sh nhưng bị `EAI_AGAIN`; nên **chưa validate bằng Prisma CLI, chưa chạy migration**.
- Không có credentials Google/Cloudinary thật và PostgreSQL chạy, nên **chưa kiểm thử đăng nhập Google, upload/view/delete/replace ảnh và invoice thực tế**, chưa kiểm chứng toàn bộ flow trên browser.

## Kiểm tra cần thực hiện trên máy người dùng

1. `cd backend && npm ci && npx prisma generate && npx prisma migrate dev --name init && npm test && npm run dev`
2. `cd frontend && npm ci && npm run build && npm run dev`
3. Làm kịch bản kiểm thử 9 bước trong `README.md` bằng tài khoản Admin và ít nhất 2 nhân viên.
4. Kiểm tra xem ảnh/hóa đơn trên cả desktop và điện thoại, đặc biệt Cloudinary authenticated asset.

**Kết luận:** Mã nguồn đã được cập nhật và qua kiểm tra cú pháp + unit tests có thể chạy offline. Chưa thể xác nhận hệ thống đã sẵn sàng production hoặc đã triển khai lên máy chủ khi chưa chạy các bước tích hợp trên môi trường có Internet và credentials.
