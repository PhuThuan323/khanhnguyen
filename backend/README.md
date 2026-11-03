# Garage OS Backend

Node.js + Express 5 + Prisma + PostgreSQL, Google ID token verification, JWT, Cloudinary authenticated assets. Xem `../README.md`.

`cp .env.example .env` -> cấu hình khóa + DATABASE_URL -> `npm ci` -> `npx prisma generate` -> `npx prisma migrate dev --name init` -> `npm test` -> `npm run dev`.
