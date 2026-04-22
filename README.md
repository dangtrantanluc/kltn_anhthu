# HRIS — Hệ thống Quản lý Nhân sự, Chấm công, Lương và Báo cáo

Hệ thống **HRIS** phục vụ 5 nghiệp vụ chính: quản lý nhân sự, đăng nhập/phân quyền,
chấm công (GPS + ca), tính lương (duyệt 2 cấp + xuất Excel/PDF), và báo cáo (Excel/PDF).

| Tầng | Stack |
|------|-------|
| Frontend | React 19 + Vite 7 + Tailwind v4 + Zustand + React Router v7 + recharts + i18next |
| Backend | Node.js 20 + Express 5 + MySQL 8 + JWT + zod + exceljs + pdfkit + node-cron |
| Auth | Access 15' + Refresh 7d (rotation + reuse detection) + lock sau 5 lần sai + email reset |
| Infra | Docker Compose (mysql + backend + nginx frontend) |

---

## 1. Yêu cầu hệ thống

**Chạy với Docker (khuyến nghị):**
- Docker 24+ và Docker Compose v2 (`docker compose ...`)

**Chạy trực tiếp (local dev):**
- Node.js **20+** (khuyến nghị 20 LTS)
- npm 10+
- MySQL **8.0+** local (hoặc dùng container mysql của compose)

---

## 2. Cấu trúc repository

```
kltn/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── modules/         # auth, users, attendance, requests, payrolls, reports, audit, dashboard
│   │   ├── middlewares/     # verifyToken, checkRole, validate, rateLimit
│   │   ├── integrations/    # mailer, excel (exceljs), pdf (pdfkit), reportBuilder
│   │   ├── jobs/            # cron jobs (attendance rollup)
│   │   ├── utils/           # password, tokens, geo, audit
│   │   └── config/          # db pool
│   ├── migrations/          # 001_init → 004_reports_audit + runner.js
│   ├── tests/               # node --test: payroll, attendance, geo, password, tokens, schema
│   ├── Dockerfile
│   └── .env.example
├── frontend/                # React SPA
│   ├── src/
│   │   ├── pages/           # auth/, hr/, attendance/, payrolls/, reports/, admin/
│   │   ├── components/      # layout, common
│   │   ├── services/        # axios + api modules
│   │   ├── store/           # Zustand
│   │   ├── router/          # PrivateRoute + RoleGuard
│   │   └── locales/         # vi.json, en.json
│   ├── Dockerfile
│   └── nginx.conf
├── skill/                   # Tài liệu role (Agent, Backend, FE, QA, SA, PO, Security)
├── ARCHITECTURE_AND_BUILD_PLAN.md
├── docker-compose.yml
├── .env.example             # env cho docker compose root
└── README.md                ← file này
```

---

## 3. Chạy nhanh bằng Docker Compose (2 lệnh)

```bash
# 1. Copy env mẫu và sinh secret ngẫu nhiên cho JWT
cp .env.example .env
# Mở .env và thay JWT_ACCESS_SECRET / JWT_REFRESH_SECRET bằng giá trị sinh từ:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 2. Build image + khởi động
docker compose up -d --build
```

Kiểm tra tiến trình:

```bash
docker compose ps
docker compose logs -f backend    # xem log BE
docker compose logs -f mysql      # xem log DB
```

Truy cập khi đã up:

| Service | URL | Ghi chú |
|---------|-----|---------|
| Frontend | http://localhost:8080 | SPA + đã proxy `/api` sang backend |
| Backend  | http://localhost:3001/health | Trả `{status:"ok"}` nếu healthy |
| MySQL    | `localhost:3306` (root/`DB_ROOT_PASSWORD`) | Mở cho client DBeaver/MySQL Workbench |

**Tài khoản demo** (seed sẵn qua migrations):

| Username | Password | Role | Ghi chú |
|----------|----------|------|---------|
| `admin` | `admin` | ADMIN | Tài khoản đăng nhập nhanh, seed từ `005_seed_admin_user.sql` |
| `admin@hris.com` | `Admin@123` | ADMIN | Tài khoản gốc từ `001_init.sql` |

> Form đăng nhập chấp nhận cả email lẫn username thuần (≥3 ký tự), nên gõ thẳng `admin` là được.

> Migration chạy **tự động** mỗi lần container backend khởi động (idempotent nhờ bảng
> `schema_migrations`). Không cần chạy tay.

Dừng stack:

```bash
docker compose down           # giữ volume (DB, uploads)
docker compose down -v        # xoá sạch volume
```

---

## 4. Chạy local (không Docker)

### 4.1. Tạo database

```bash
# Khởi động MySQL 8 local (hoặc dùng container mysql standalone):
docker run -d --name hris-mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=hris_db \
  mysql:8.0
```

### 4.2. Backend

```bash
cd backend
cp .env.example .env       # sửa DB_PASSWORD, JWT_*… nếu cần
npm install
npm run migrate            # áp dụng toàn bộ 4 migration
npm run dev                # nodemon, lắng nghe :3001
```

Smoke test:

```bash
curl -s http://localhost:3001/health
# {"status":"ok","time":"..."}
```

### 4.3. Frontend

```bash
cd frontend
npm install
# File `.env` (có sẵn) trỏ VITE_API_BASE_URL=http://localhost:3001/api
npm run dev                # Vite dev server :5173
```

Mở <http://localhost:5173>, đăng nhập `admin@hris.com` / `Admin@123`.

---

## 5. Chạy test

### 5.1. Backend unit test (Node built-in runner)

```bash
cd backend
npm test
```

35 tests trên các pure function:

| File | Phạm vi |
|------|---------|
| `tests/payroll.test.js` | Công thức tính lương, snapshot, rounding, multiplier |
| `tests/attendance.test.js` | Rollup `PRESENT / LATE / MISSING_CHECKOUT`, `allowed_late_mins`, min/max punch |
| `tests/geo.test.js` | Haversine + `findNearestLocation` |
| `tests/password.test.js` | bcrypt hash / compare / salt khác nhau |
| `tests/tokens.test.js` | JWT roundtrip, refresh≠access, "remember" kéo dài exp |
| `tests/schema.test.js` | zod validation (payroll, reports) |

> Test **không cần DB** — tất cả đều là unit test trên hàm pure / hàm config.

### 5.2. Frontend build check

```bash
cd frontend
npm run build     # Vite production build — fail nếu có lỗi import/TS
npm run lint      # ESLint
```

### 5.3. Smoke test API (khi compose đã up)

```bash
# Login
curl -s http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hris.com","password":"Admin@123"}' | jq

# /auth/me với access token
TOKEN=...
curl -s http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN" | jq
```

---

## 6. Cấu hình môi trường

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `DB_HOST` | `mysql` (trong compose) / `localhost` | Host MySQL |
| `DB_ROOT_PASSWORD` | `root` | Mật khẩu root MySQL (compose) |
| `DB_NAME` | `hris_db` | Tên database |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | _thay đổi!_ | Secret ≥ 32 byte |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | TTL access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | TTL refresh mặc định |
| `JWT_REFRESH_REMEMBER_EXPIRES_IN` | `30d` | TTL refresh khi "Ghi nhớ" |
| `BCRYPT_ROUNDS` | `12` | Cost bcrypt (test dùng 4) |
| `LOGIN_MAX_ATTEMPTS` | `5` | Số lần sai tối đa |
| `LOGIN_LOCK_MINUTES` | `15` | Thời gian khoá tài khoản |
| `PASSWORD_RESET_EXPIRES_MINUTES` | `60` | TTL token reset mật khẩu |
| `CORS_ORIGIN` | `http://localhost:8080` | Origin FE được phép gọi API |
| `APP_PUBLIC_URL` | `http://localhost:8080` | Dùng trong email reset |
| `SMTP_HOST` | _(empty)_ | Bỏ trống → email in ra console |
| `FRONTEND_EXPOSE_PORT` / `BACKEND_EXPOSE_PORT` | `8080` / `3001` | Cổng publish ra host |

Sinh secret mạnh:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 7. API Endpoints chính

Tất cả đặt dưới `/api`. JSON, header `Authorization: Bearer <jwt>`.

| Module | Endpoints tiêu biểu |
|--------|---------------------|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `POST /auth/change-password` · `GET /auth/me` |
| Users (HR) | `GET/POST /users` · `GET/PUT/DELETE /users/:id` · `PATCH /users/me` |
| Attendance | `POST /attendance/punch` (GPS) · `GET /attendances` · `GET /attendances/me` · `PUT /attendances/:id` · `POST /attendance/rollup` |
| Requests (đơn từ) | `GET /requests` · `POST /requests` · `PATCH /requests/:id/approve` · `PATCH /requests/:id/reject` · `GET /requests/pending-count` |
| Shifts / Locations | `GET/POST/PUT/DELETE /shifts` · `GET/POST/PUT/DELETE /locations` |
| Payrolls | `GET /payrolls` · `GET /payrolls/:id` · `POST /payrolls/generate` · `PUT /payrolls/:id` · `PATCH /payrolls/:id/manager-approve` · `PATCH /payrolls/:id/employee-confirm` · `GET /payrolls/:id/export?format=xlsx\|pdf` · `GET /payrolls/export` |
| Reports | `POST /reports/generate` · `GET /reports` · `GET /reports/:id` · `GET /reports/:id/download` |
| Audit | `GET /audit-logs` · `GET /audit-logs/actions` |
| Dashboard | `GET /dashboard/admin` |

Chi tiết phạm vi role xem [`ARCHITECTURE_AND_BUILD_PLAN.md`](ARCHITECTURE_AND_BUILD_PLAN.md).

---

## 8. Troubleshooting

**BE log `MySQL connection failed: ECONNREFUSED 127.0.0.1:3306`**
→ DB chưa sẵn sàng hoặc `DB_HOST` sai. Trong docker compose, `DB_HOST=mysql` (tên service).
Local dev: `localhost`.

**FE không gọi được BE (CORS)**
→ Đảm bảo `CORS_ORIGIN` trong `.env` khớp origin FE (gồm cả port).
Ví dụ dev: `http://localhost:5173`. Compose: `http://localhost:8080`.

**Không nhận được email reset password**
→ SMTP trống trong `.env` → link reset in ra `docker compose logs backend`. Kiểm tra log.

**Chấm công luôn báo "ngoài phạm vi"**
→ Kiểm tra bảng `locations` đã có ít nhất 1 record `is_active=1` với `latitude`, `longitude`, `radius_m` hợp lý.
Migration `003_locations.sql` seed sẵn 1 location mẫu ở TP.HCM bán kính 150m.

**Đổi file migration sau khi đã apply**
→ `schema_migrations` chỉ nhớ theo tên file. Nếu sửa `.sql` đã apply, phải `TRUNCATE schema_migrations`
rồi chạy lại migrate **hoặc** tạo migration mới `005_*.sql`. Khuyến nghị cái sau.

**Muốn reset toàn bộ DB**
```bash
docker compose down -v   # xoá volume mysql_data
docker compose up -d --build
```

---

## 9. Quy ước commit & phát triển

- Branch main bảo vệ, feature branch dạng `feat/<module>-<mô-tả>`
- Mỗi sprint bàn giao: migration mới (nếu schema đổi) + service + route + test + cập nhật README/CHANGELOG
- Trước khi PR: `npm test` (backend) + `npm run build` (frontend) phải pass

---

## 10. Tham chiếu

- `ARCHITECTURE_AND_BUILD_PLAN.md` — Kiến trúc, sprint plan, traceability matrix
- `Copy of kltn.pdf` — User stories gốc từ đề tài KLTN
- `skill/*.md` — Role guides cho AI agent (Solution Architect, Backend, FE, QA…)
