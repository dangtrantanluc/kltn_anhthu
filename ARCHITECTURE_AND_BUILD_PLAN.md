# HRIS - Phân tích Kiến trúc & Plan Build chi tiết

> Tài liệu phân tích dựa trên **User Story** (file `Copy of kltn.pdf`) cho hệ thống **HRIS - Human Resource Information System** (Quản lý nhân sự - chấm công - lương - báo cáo).
> Stack hiện tại: **Node.js 20 + Express 5 + MySQL 8** (backend) & **React 19 + Vite + Tailwind v4 + Zustand** (frontend).

---

## 1. Tổng quan nghiệp vụ (5 Module chính)

| STT | Module | Mục tiêu nghiệp vụ | Actor chính |
|-----|--------|--------------------|-------------|
| 1 | Quản lý nhân sự | CRUD hồ sơ nhân viên, nhân viên tự xem/cập nhật | HR, Nhân viên |
| 2 | Quản lý hệ thống | Đăng nhập, phân quyền, quên/đặt lại mật khẩu, session | Tất cả |
| 3 | Quản lý chấm công | Check-in/out, ca, địa điểm, yêu cầu bổ sung, nghỉ phép | Admin, Quản lý, Nhân viên |
| 4 | Quản lý lương | Tính lương từ chấm công, duyệt 2 cấp, xuất Excel/PDF | Kế toán, Quản lý, Nhân viên |
| 5 | Quản lý báo cáo | Lập/xem/in báo cáo, xuất PDF/Excel | Quản lý phòng ban |

### 1.1. Ma trận Actor × Module

| Actor | HR | Auth | Chấm công | Lương | Báo cáo |
|-------|----|------|-----------|-------|---------|
| ADMIN | full | full | full + cấu hình ca/địa điểm | - | view |
| HR | full | view | view | - | full |
| MANAGER | view theo phòng ban | - | duyệt yêu cầu + xem theo phòng | xác nhận bảng lương | full |
| ACCOUNTANT | view | - | view | tính, sửa, xuất | view |
| USER (Nhân viên) | view/sửa cá nhân | login/logout/đổi mật khẩu | check-in/out + gửi yêu cầu | xác nhận phiếu lương cá nhân | - |

---

## 2. Kiến trúc tổng thể

### 2.1. Kiến trúc hệ thống (C4 - Container level)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Người dùng (Browser)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                SPA React 19 (Vite)                               │
│  - Zustand (auth/user store)                                     │
│  - React Router v7 (layout route + PrivateRoute + RoleGuard)     │
│  - Axios instance (interceptor gắn JWT, refresh khi 401)         │
│  - react-i18next (vi / en)                                       │
│  - react-big-calendar (lịch chấm công)                           │
│  - recharts (dashboard báo cáo)                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST + JSON (JWT Bearer)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express 5 API (Node.js 20, CommonJS)                │
│                                                                  │
│   ┌──────────────────────────────────────────────────┐           │
│   │              Middleware pipeline                  │           │
│   │   helmet  →  cors  →  morgan  →  rateLimiter      │           │
│   │      →  requestLogger  →  jwtAuth  →  rbac        │           │
│   └──────────────────────────────────────────────────┘           │
│                                                                  │
│   ┌──────────────────────────────────────────────────┐           │
│   │               Modules (feature-sliced)           │           │
│   │   auth │ users │ departments │ positions │ shifts│           │
│   │   attendance │ requests │ leave │ payrolls       │           │
│   │   reports (mới) │ locations (mới)                │           │
│   │                                                  │           │
│   │  Mỗi module: routes → controller → service → repo│           │
│   └──────────────────────────────────────────────────┘           │
│                                                                  │
│   ┌─────────────────┐   ┌──────────────────────────┐             │
│   │   Jobs (cron)   │   │  Integrations            │             │
│   │ - rollup punch  │   │  - Mailer (nodemailer)   │             │
│   │ - monthly       │   │  - Excel (exceljs)       │             │
│   │   payroll       │   │  - PDF   (pdfkit)        │             │
│   │ - backup        │   │  - Storage (local/S3)    │             │
│   └─────────────────┘   └──────────────────────────┘             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ mysql2 pool (promise API)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  MySQL 8.0 (utf8mb4)                                             │
│  departments · positions · shifts · locations · users            │
│  punch_logs · attendances · requests · payrolls · reports        │
│  audit_logs · password_resets · refresh_tokens                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Các quyết định kiến trúc (ADR rút gọn)

| # | Quyết định | Lý do | Đánh đổi |
|---|------------|-------|----------|
| 1 | **Monolith modular** (không microservice) | Scope KLTN, team 1–2 người, deploy đơn giản | Khó scale độc lập từng domain |
| 2 | **MySQL** thay vì NoSQL | Dữ liệu có quan hệ mạnh (user↔department↔attendance↔payroll), cần transaction ACID cho tính lương | Schema cứng, migration phải quản lý |
| 3 | **JWT access token (15') + refresh token (7d) trong DB** | Stateless API, hỗ trợ "Ghi nhớ đăng nhập", có thể revoke | Cần bảng `refresh_tokens`, logic xoay vòng |
| 4 | **RBAC theo role string** (ADMIN/HR/MANAGER/ACCOUNTANT/USER) | Đơn giản, đủ dùng; quyền kiểm tra tại middleware | Không linh hoạt như permission-based |
| 5 | **Punch logs → Attendances (cron rollup mỗi đêm 01:00)** | Tách raw data từ máy chấm công khỏi dữ liệu nghiệp vụ; idempotent, chạy lại được | Độ trễ 1 ngày — chấp nhận cho KLTN |
| 6 | **Payroll snapshot giá giờ/hệ số** tại thời điểm chốt | Giữ tính đúng đắn lịch sử dù admin đổi lương sau này | Tốn thêm cột snapshot |
| 7 | **Audit log** cho các action HR/Payroll/Attendance sửa | User story yêu cầu "Thông báo kết quả" + truy vết | Thêm ghi DB mỗi write |
| 8 | **Export file đồng bộ** (không queue) cho Excel/PDF | Volume KLTN nhỏ, tránh phức tạp hoá | Nếu > vài nghìn record cần refactor sang queue |

### 2.3. Sơ đồ luồng dữ liệu chấm công → lương

```
[ Máy chấm công / GPS check-in ]
            │
            ▼ (API POST /attendance/punch hoặc import)
     punch_logs (raw, is_processed=false)
            │
            ▼  Cron 01:00 hằng ngày - attendanceRollupJob
     attendances (1 bản ghi / user / ngày, có late_mins, total_worked_hours)
            │
            │  + requests (LEAVE APPROVED)
            │  + users.base_hourly_wage, salary_multiplier, shift
            ▼  Cron 01:00 ngày 1 đầu tháng - payrollGenerationJob
     payrolls (status=DRAFT, có snapshot giá giờ)
            │
            ▼  Manager review
     payrolls.status = MANAGER_APPROVED
            │
            ▼  Employee confirm
     payrolls.status = USER_CONFIRMED  ←── Kế toán export PDF/Excel
```

---

## 3. Schema CSDL (bổ sung so với `schema.sql` hiện tại)

Schema hiện tại đã có: `departments, positions, shifts, users, punch_logs, attendances, requests, payrolls`.
**Cần bổ sung cho đủ user story:**

### 3.1. Bảng mới

```sql
-- US2: Quên mật khẩu
CREATE TABLE password_resets (
  id           BIGINT PK AUTO_INCREMENT,
  user_id      BIGINT NOT NULL FK users.id,
  token_hash   VARCHAR(255) NOT NULL,
  expires_at   DATETIME NOT NULL,
  used_at      DATETIME NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token_hash (token_hash)
);

-- US2: "Ghi nhớ đăng nhập" + revoke
CREATE TABLE refresh_tokens (
  id           BIGINT PK AUTO_INCREMENT,
  user_id      BIGINT NOT NULL FK users.id,
  token_hash   VARCHAR(255) NOT NULL UNIQUE,
  user_agent   VARCHAR(255),
  ip           VARCHAR(45),
  expires_at   DATETIME NOT NULL,
  revoked_at   DATETIME NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- US2: Khóa tài khoản sau N lần sai
ALTER TABLE users
  ADD COLUMN failed_login_count INT DEFAULT 0,
  ADD COLUMN locked_until DATETIME NULL;

-- US3: Địa điểm chấm công
CREATE TABLE locations (
  id           BIGINT PK AUTO_INCREMENT,
  name         VARCHAR(100) NOT NULL,
  address      VARCHAR(255),
  latitude     DECIMAL(10,7),
  longitude    DECIMAL(10,7),
  radius_m     INT DEFAULT 100 COMMENT 'Bán kính cho phép chấm (m)',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE punch_logs
  ADD COLUMN location_id BIGINT NULL FK locations.id,
  ADD COLUMN latitude DECIMAL(10,7),
  ADD COLUMN longitude DECIMAL(10,7);

-- US5: Báo cáo lưu vào CSDL
CREATE TABLE reports (
  id            BIGINT PK AUTO_INCREMENT,
  created_by    BIGINT NOT NULL FK users.id,
  report_type   VARCHAR(50) NOT NULL COMMENT 'ATTENDANCE, PAYROLL, HEADCOUNT, LEAVE',
  period_from   DATE NOT NULL,
  period_to     DATE NOT NULL,
  department_id BIGINT NULL FK departments.id,
  params_json   JSON,
  file_path     VARCHAR(500) NULL,
  file_format   VARCHAR(10) COMMENT 'PDF | XLSX',
  status        VARCHAR(20) DEFAULT 'GENERATED',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log xuyên suốt hệ thống
CREATE TABLE audit_logs (
  id           BIGINT PK AUTO_INCREMENT,
  actor_id     BIGINT FK users.id,
  action       VARCHAR(100) NOT NULL COMMENT 'USER_CREATE, PAYROLL_APPROVE, ATTENDANCE_EDIT...',
  entity       VARCHAR(50),
  entity_id    BIGINT,
  diff_json    JSON,
  ip           VARCHAR(45),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actor_created (actor_id, created_at),
  INDEX idx_entity (entity, entity_id)
);
```

### 3.2. Index quan trọng (bổ sung)

```sql
CREATE INDEX idx_attendance_user_date ON attendances(user_id, work_date);
CREATE INDEX idx_requests_status_type ON requests(status, request_type);
CREATE INDEX idx_payroll_status ON payrolls(status, payroll_year, payroll_month);
CREATE INDEX idx_punch_processed_time ON punch_logs(is_processed, punch_time);
```

---

## 4. Thiết kế API (REST)

Quy ước chung:
- Base URL: `/api/v1`
- Auth: `Authorization: Bearer <jwt>` (trừ `/auth/login`, `/auth/forgot`, `/auth/reset`)
- Error envelope: `{ "error": { "code": "USER_NOT_FOUND", "message": "..." } }`
- Pagination: `?page=1&limit=20&sort=-created_at`

### 4.1. Module 2 - Auth

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| POST | `/auth/login` | public | Đăng nhập, trả access + refresh token |
| POST | `/auth/refresh` | public | Xoay access token từ refresh |
| POST | `/auth/logout` | any | Revoke refresh hiện tại |
| POST | `/auth/forgot-password` | public | Gửi email link reset |
| POST | `/auth/reset-password` | public | Đặt mật khẩu mới từ token |
| POST | `/auth/change-password` | any | Đổi mật khẩu khi đã login |
| GET | `/auth/me` | any | Thông tin user hiện tại |

### 4.2. Module 1 - Users (Nhân sự)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/users` | HR, ADMIN | Danh sách (filter: department, role, q) |
| POST | `/users` | HR | Thêm nhân viên (kiểm tra trùng `employee_code`, `email`) |
| GET | `/users/:id` | HR, ADMIN, MANAGER(cùng phòng), owner | Chi tiết |
| PUT | `/users/:id` | HR | Sửa |
| DELETE | `/users/:id` | HR | Xoá mềm (`is_active=false`) |
| PATCH | `/users/me` | any | Nhân viên tự cập nhật field được phép |
| GET | `/departments`, `/positions`, `/shifts` | any | Danh mục phụ trợ |

### 4.3. Module 3 - Attendance

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| POST | `/attendance/punch` | USER | Check-in/out (body: type, lat, lng) - kiểm tra radius |
| GET | `/attendance` | scope theo role | Bảng chấm công (filter: user_id, month, department_id) |
| GET | `/attendance/me` | USER | Lịch sử của chính mình |
| PUT | `/attendance/:id` | ADMIN, MANAGER | Chỉnh sửa thủ công (ghi audit) |
| POST | `/attendance/rollup` | ADMIN | Trigger rollup thủ công (debug) |
| GET | `/locations`, `POST/PUT/DELETE /locations/:id` | ADMIN | Cấu hình địa điểm |
| GET | `/shifts`, `POST/PUT/DELETE /shifts/:id` | ADMIN | Cấu hình ca |

### 4.4. Requests (đơn từ: nghỉ phép + bổ sung)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/requests` | scope | Danh sách (filter: type, status) |
| POST | `/requests` | USER | Gửi yêu cầu (LEAVE/MISSING_PUNCH) |
| PATCH | `/requests/:id/approve` | MANAGER, ADMIN | Duyệt |
| PATCH | `/requests/:id/reject` | MANAGER, ADMIN | Từ chối + `reject_reason` |

### 4.5. Module 4 - Payroll

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/payrolls` | scope | Danh sách bảng lương |
| GET | `/payrolls/:id` | scope | Chi tiết phiếu lương |
| POST | `/payrolls/generate` | ACCOUNTANT, ADMIN | Tính lương cho kỳ `month/year` |
| PUT | `/payrolls/:id` | ACCOUNTANT | Sửa bảng lương khi còn DRAFT |
| PATCH | `/payrolls/:id/manager-approve` | MANAGER | Xác nhận (theo phòng ban) |
| PATCH | `/payrolls/:id/employee-confirm` | USER (owner) | Nhân viên xác nhận |
| GET | `/payrolls/:id/export?format=xlsx\|pdf` | ACCOUNTANT, MANAGER | Xuất file |

### 4.6. Module 5 - Reports

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/reports` | MANAGER, HR, ADMIN | Danh sách báo cáo đã tạo |
| POST | `/reports/generate` | MANAGER, HR, ADMIN | Lập báo cáo (type, period, department) |
| GET | `/reports/:id` | owner, ADMIN | Xem chi tiết |
| GET | `/reports/:id/download?format=pdf\|xlsx` | owner, ADMIN | Tải/in |

---

## 5. Cấu trúc mã nguồn

### 5.1. Backend (đã có khung, cần hoàn thiện)

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # mysql2 pool
│   │   ├── env.js                # load + validate .env
│   │   └── logger.js             # pino hoặc winston
│   ├── middlewares/
│   │   ├── auth.js               # verify JWT
│   │   ├── rbac.js               # requireRole(['HR','ADMIN'])
│   │   ├── scope.js              # restrict department-scope
│   │   ├── error.js              # global error handler
│   │   ├── rateLimit.js          # chống brute force /auth/login
│   │   └── validate.js           # zod / joi wrapper
│   ├── modules/
│   │   ├── auth/                 # login, refresh, forgot, reset
│   │   ├── users/                # + /me
│   │   ├── departments/
│   │   ├── positions/
│   │   ├── shifts/
│   │   ├── locations/            # ← MỚI
│   │   ├── attendance/           # punch + rollup + edit
│   │   ├── requests/             # leave + missing-punch
│   │   ├── payrolls/             # generate + approve + export
│   │   └── reports/              # ← MỚI
│   ├── jobs/
│   │   ├── attendanceRollup.js   # cron 01:00 mỗi ngày
│   │   ├── payrollGeneration.js  # cron 01:00 ngày 1
│   │   └── cleanupTokens.js      # cron xoá token hết hạn
│   ├── integrations/
│   │   ├── mailer.js             # nodemailer
│   │   ├── excel.js              # exceljs
│   │   └── pdf.js                # pdfkit
│   ├── utils/
│   │   ├── password.js           # bcrypt wrapper
│   │   ├── tokens.js             # sign/verify JWT
│   │   ├── geo.js                # haversine distance
│   │   └── audit.js              # writeAudit(actorId, action, ...)
│   ├── app.js
│   └── server.js
├── migrations/                   # ← MỚI (thay seed.js bằng migration chạy tuần tự)
│   ├── 001_init.sql
│   ├── 002_auth_extras.sql
│   ├── 003_locations.sql
│   ├── 004_reports_audit.sql
│   └── runner.js
├── tests/
│   ├── auth.test.js
│   ├── attendance.test.js
│   └── payroll.test.js
├── .env.example
└── package.json
```

Mỗi module theo layered pattern:

```
modules/payrolls/
├── payroll.routes.js        # express.Router()
├── payroll.controller.js    # HTTP → service, format response
├── payroll.service.js       # nghiệp vụ thuần (testable)
├── payroll.repo.js          # truy vấn DB
├── payroll.schema.js        # zod input schemas
└── __tests__/
    └── payroll.service.test.js
```

### 5.2. Frontend

```
frontend/src/
├── services/
│   ├── api.js                    # axios instance + interceptors
│   ├── authService.js
│   ├── userService.js
│   ├── attendanceService.js
│   ├── requestService.js
│   ├── payrollService.js
│   └── reportService.js
├── store/
│   ├── authStore.js              # zustand: user, tokens, login/logout
│   └── uiStore.js                # toast, modal
├── router/
│   ├── index.jsx                 # createBrowserRouter
│   ├── PrivateRoute.jsx          # đã có
│   └── RoleGuard.jsx             # ← MỚI
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx          # sidebar + topbar
│   │   └── Sidebar.jsx           # menu theo role
│   ├── common/
│   │   ├── DataTable.jsx
│   │   ├── Pagination.jsx
│   │   ├── ConfirmDialog.jsx
│   │   └── Toast.jsx
│   ├── AttendanceTable.jsx       # đã có
│   └── forms/...                 # UserForm, RequestForm...
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx         # đã có
│   │   ├── ForgotPasswordPage.jsx
│   │   └── ResetPasswordPage.jsx
│   ├── dashboard/
│   │   ├── UserDashboard.jsx     # đã có
│   │   └── AdminDashboard.jsx
│   ├── hr/
│   │   ├── UsersListPage.jsx
│   │   ├── UserDetailPage.jsx
│   │   └── UserFormPage.jsx
│   ├── attendance/
│   │   ├── AttendanceCalendar.jsx  # đã có
│   │   ├── PunchPage.jsx
│   │   └── AdminAttendancePage.jsx
│   ├── requests/
│   │   ├── RequestsView.jsx       # đã có
│   │   └── RequestApprovalPage.jsx
│   ├── payrolls/
│   │   ├── PayrollListPage.jsx
│   │   ├── PayrollDetailPage.jsx
│   │   └── PayrollGeneratePage.jsx
│   ├── reports/
│   │   ├── ReportListPage.jsx
│   │   └── ReportGeneratePage.jsx
│   ├── admin/
│   │   ├── ShiftsPage.jsx
│   │   └── LocationsPage.jsx
│   └── Profile.jsx                # đã có
├── hooks/
│   ├── useAuth.js
│   ├── useRole.js
│   └── useDebounce.js
├── utils/
│   ├── format.js                  # tiền VND, ngày giờ
│   └── geo.js                     # get current position
├── locales/
│   ├── vi/
│   └── en/
├── App.jsx
├── main.jsx
└── i18n.js
```

---

## 6. Bảo mật & Non-functional

| Hạng mục | Giải pháp |
|----------|-----------|
| Password | bcrypt cost 12 |
| JWT | HS256, secret ≥ 32 byte, access 15', refresh 7d, refresh token stored hashed |
| Brute-force login | `express-rate-limit` 5 req/15' per IP+email; sau 5 lần sai → `locked_until = now + 15'` |
| CORS | Whitelist origin theo `CORS_ORIGIN` env |
| Helmet | Bật mặc định + `Content-Security-Policy` |
| Input validation | Zod schemas ở mọi route (body/query/params) |
| SQL | Luôn dùng prepared statements mysql2 (`?` placeholder); không string concat |
| RBAC | Double-check: middleware `requireRole` + scope filter trong repo (WHERE department_id = req.user.department_id) |
| Audit | Mọi write HR/Payroll/Attendance chỉnh sửa → `audit_logs` |
| Secrets | `.env` không commit; `.env.example` commit |
| File upload / avatar | Giới hạn 2MB, whitelist mime, lưu `uploads/` (dev) hoặc S3 (prod) |
| GPS | Validate lat/lng, tính haversine distance ≤ `locations.radius_m` |
| Logging | `morgan` combined + `pino` JSON log; KHÔNG log password/token |

---

## 7. Plan build chi tiết (8 tuần, chia Sprint 1 tuần)

Giả định: 1 dev full-time hoặc 2 dev (1 BE + 1 FE) song song. Mỗi sprint = 5 ngày.

### Sprint 0 — Setup (3 ngày)
**Mục tiêu:** Khung dự án chạy được, CI cơ bản.

- [x] Repo, Node 20 + MySQL 8 docker-compose
- [x] Express 5 skeleton, helmet, cors, morgan, error middleware
- [x] `mysql2` pool, `schema.sql` chạy được
- [x] React + Vite + Tailwind v4 + Zustand + react-router v7
- [ ] **Thêm**: ESLint + Prettier, husky pre-commit, `.env.example`, GitHub Actions `npm run lint && npm test`
- [ ] **Thêm**: Migrations runner (`migrations/runner.js`) thay cho seed thủ công
- [ ] **Thêm**: `pino` logger + request-id middleware
- [ ] **Thêm**: OpenAPI/Swagger skeleton (swagger-jsdoc)

**Deliverable:** `docker compose up` chạy được BE + DB + FE; gọi `/api/v1/health` → 200.

---

### Sprint 1 — Module 2: Auth & Phân quyền (5 ngày)
**User stories cover:** Toàn bộ Module 2 (đăng nhập, phân quyền, quên/đặt lại mật khẩu, ghi nhớ đăng nhập, các case lỗi).

**Backend**
- Migration `002_auth_extras.sql` (refresh_tokens, password_resets, failed_login_count, locked_until)
- `POST /auth/login` — bcrypt compare, tăng `failed_login_count`, lock sau 5 lần
- `POST /auth/refresh` — rotate refresh token, phát hiện reuse → revoke toàn bộ
- `POST /auth/logout` — revoke refresh
- `POST /auth/forgot-password` — tạo token hash, gửi mail (dev: in console, prod: SMTP)
- `POST /auth/reset-password` — verify token chưa dùng, chưa hết hạn; update password
- `GET /auth/me`
- Middleware `auth`, `requireRole`, `scope`
- `express-rate-limit` cho `/auth/login` + `/auth/forgot-password`
- Unit test: login happy + lock + wrong pass + expired token

**Frontend**
- Axios instance: interceptor gắn token, auto refresh khi 401, retry request
- Zustand `authStore`: login/logout/me/refresh
- Pages: Login (đã có, refactor), ForgotPassword, ResetPassword, ChangePassword (trong Profile)
- `PrivateRoute` + `RoleGuard`
- i18n: vi/en cơ bản

**Acceptance criteria:**
- Sai mật khẩu 5 lần → tài khoản khoá 15'
- Đóng tab mở lại vẫn login (nếu "Ghi nhớ")
- Reset password token hết hạn → báo lỗi rõ

---

### Sprint 2 — Module 1: Quản lý nhân sự (5 ngày)
**User stories cover:** Toàn bộ Module 1.

**Backend**
- CRUD `/users` + danh mục `/departments`, `/positions`, `/shifts`
- Validation: `employee_code` unique, `email` unique, định dạng, required
- Xoá mềm (`is_active=false`) thay vì DELETE thật
- `PATCH /users/me` — whitelist field nhân viên được sửa (full_name, phone, avatar)
- Audit log tất cả thao tác HR

**Frontend**
- `UsersListPage`: DataTable + search + filter department/role + pagination
- `UserFormPage`: thêm/sửa, chọn department/position/shift (combobox)
- `UserDetailPage`
- `Profile.jsx`: cho phép sửa field cá nhân + đổi password
- ConfirmDialog xoá
- Toast thông báo thành công/lỗi

**Acceptance:**
- HR thêm NV trùng `employee_code` → báo lỗi không crash
- HR xoá → NV biến mất khỏi list nhưng vẫn còn trong DB
- Nhân viên thường không vào được `/users`

---

### Sprint 3 — Module 3 (phần 1): Chấm công cơ bản (5 ngày)
**User stories cover:** Hiển thị chức năng, Check-in/out, Xem bảng, Xem lịch sử, Cấu hình ca, Cấu hình địa điểm.

**Backend**
- Migration `003_locations.sql`
- `POST /attendance/punch` — nhận lat/lng, validate khoảng cách ≤ `radius_m`
- `GET /attendance` với scope (ADMIN all, MANAGER theo phòng, USER cá nhân)
- CRUD `/locations`, `/shifts`
- Job `attendanceRollup.js`: mỗi đêm gom `punch_logs` (IN đầu, OUT cuối) → `attendances`, tính `late_mins`, `total_worked_hours`, `status`
- Test: rollup idempotent (chạy lại không dup)

**Frontend**
- `PunchPage`: nút Check-in/out lớn, gọi `geolocation` API, hiển thị "Bạn đang ở cách VP X m"
- `AttendanceCalendar.jsx`: refactor, đổ dữ liệu real
- `AdminAttendancePage`: bảng tháng, filter user/phòng ban, export nút (Sprint sau)
- `ShiftsPage`, `LocationsPage` cho admin

**Acceptance:**
- Chấm công ngoài bán kính → từ chối với message rõ
- Check-in muộn → `status=LATE`, `late_mins > 0`
- Chạy job thủ công qua `POST /attendance/rollup`

---

### Sprint 4 — Module 3 (phần 2): Đơn từ (5 ngày)
**User stories cover:** Gửi/duyệt yêu cầu bổ sung, nghỉ phép; các case lỗi.

**Backend**
- `POST /requests` (LEAVE hoặc MISSING_PUNCH), validate `target_date`, `reason`
- `GET /requests` scope + filter
- `PATCH /requests/:id/approve` — APPROVED → nếu là MISSING_PUNCH thì insert/update `attendances` ngày đó; nếu LEAVE_PAID → sẽ được cộng vào `total_paid_leave_hours` khi tính lương
- `PATCH /requests/:id/reject` với `reject_reason`
- Manager chỉ duyệt được request thuộc phòng ban
- Notification (log + email) khi duyệt

**Frontend**
- `RequestsView.jsx`: refactor, form gửi yêu cầu
- `RequestApprovalPage`: tab "Chờ duyệt", nút Approve/Reject
- Badge đếm số yêu cầu chờ trên Sidebar

**Acceptance:**
- Nhân viên gửi LEAVE chồng lên ngày đã APPROVED → báo lỗi
- Manager khác phòng không duyệt được

---

### Sprint 5 — Module 4: Quản lý lương (5 ngày)
**User stories cover:** Toàn bộ Module 4.

**Backend**
- Service `payroll.service.js`: `generateMonthly(year, month)`
  - Lấy users active
  - Tổng hợp `attendances.total_worked_hours` trong tháng
  - Cộng `requests` LEAVE PAID APPROVED → `total_paid_leave_hours`
  - `total_calculated_salary = (actual + paid_leave) * base_hourly_wage * salary_multiplier`
  - Snapshot giá giờ + hệ số
  - Idempotent: UNIQUE (user, month, year) — `ON DUPLICATE KEY UPDATE` chỉ khi status=DRAFT
- `PATCH /payrolls/:id/manager-approve` — chỉ manager cùng phòng, chỉ khi `status=DRAFT`
- `PATCH /payrolls/:id/employee-confirm` — chỉ owner, chỉ khi `status=MANAGER_APPROVED`
- Cron `payrollGeneration.js` ngày 1 hằng tháng 01:00
- Export `exceljs` (1 file / NV hoặc gộp phòng ban) + `pdfkit` phiếu lương cá nhân
- Audit mọi thay đổi

**Frontend**
- `PayrollListPage`: filter tháng/năm, status badge, Kế toán thấy "Tính lương kỳ này" nếu chưa có
- `PayrollDetailPage`: hiển thị công thức minh bạch (giờ × giá × hệ số), nút Approve (manager), Confirm (employee), Export (kế toán)
- Recharts: biểu đồ tổng quỹ lương theo tháng ở dashboard admin

**Acceptance:**
- Kế toán generate lại kỳ đã APPROVED → bị từ chối
- Nhân viên chưa confirm → `status=MANAGER_APPROVED` giữ nguyên
- Đổi `base_hourly_wage` sau khi tính lương → bảng cũ không đổi (nhờ snapshot)

---

### Sprint 6 — Module 5: Báo cáo (4 ngày)
**User stories cover:** Toàn bộ Module 5.

**Backend**
- Migration `004_reports_audit.sql`
- `POST /reports/generate` — body: `{ type, period_from, period_to, department_id }`
  - Types: `ATTENDANCE_SUMMARY`, `PAYROLL_SUMMARY`, `HEADCOUNT`, `LEAVE_SUMMARY`
  - Query aggregate, render Excel/PDF, lưu vào `uploads/reports/`, ghi `reports` row
- `GET /reports`, `GET /reports/:id`, `GET /reports/:id/download`

**Frontend**
- `ReportGeneratePage`: form chọn type + period + department + format
- `ReportListPage`: lịch sử, tải lại, nút In (trigger `window.print()` cho xem trên web, download cho file)

**Acceptance:**
- Báo cáo không có dữ liệu → thông báo rõ, không tạo file rỗng
- In/Tải file thất bại → retry không tạo bản ghi `reports` trùng

---

### Sprint 7 — Hoàn thiện + Non-functional (4 ngày)

- **Audit viewer**: trang admin xem `audit_logs` với filter actor/action/date
- **Dashboard**: admin thấy headcount, attendance hôm nay, pending requests, quỹ lương tháng; user thấy chấm công tuần, lương tháng gần nhất, đơn chờ duyệt
- **i18n**: hoàn thiện 2 ngôn ngữ vi/en
- **Dark mode** (optional)
- **E2E**: Playwright cho 3 flow chính: Login → Check-in → Xem bảng lương
- **Docs**: README.md + Swagger UI tại `/api/docs`
- **Performance pass**: index DB, N+1 queries, pagination đủ chưa
- **Backup**: script `mysqldump` nightly + hướng dẫn restore

---

### Sprint 8 — Kiểm thử & Nghiệm thu (5 ngày)

- Viết test case đối chiếu từng user story (checklist dưới)
- User Acceptance Testing với giảng viên/demo
- Bug fix
- Đóng gói: Dockerfile BE + FE (nginx), docker-compose production
- Slide + demo video

---

## 8. Traceability Matrix — User Story → Implementation

| US | Chức năng | API | Code (BE) | Code (FE) | Sprint |
|----|-----------|-----|-----------|-----------|--------|
| 1.1 | Thêm hồ sơ NV | POST /users | `users.controller.create` | `UserFormPage` | 2 |
| 1.2 | Sửa hồ sơ | PUT /users/:id | `users.controller.update` | `UserFormPage` | 2 |
| 1.3 | Xoá | DELETE /users/:id | `users.controller.softDelete` | `UsersListPage` | 2 |
| 1.4 | Xem cá nhân | GET /auth/me, GET /users/:id | `auth.controller.me` | `Profile` | 1-2 |
| 1.5 | Cập nhật cá nhân | PATCH /users/me | `users.controller.updateMe` | `Profile` | 2 |
| 1.6 | Xử lý trùng dữ liệu | — | `users.service` (throw DUPLICATE) | Toast error | 2 |
| 2.1 | Đăng nhập | POST /auth/login | `auth.service.login` | `LoginPage` | 1 |
| 2.2 | Quên mật khẩu | POST /auth/forgot-password | `auth.service.forgot` | `ForgotPasswordPage` | 1 |
| 2.3 | Đặt lại mật khẩu | POST /auth/reset-password | `auth.service.reset` | `ResetPasswordPage` | 1 |
| 2.4 | Ghi nhớ đăng nhập | POST /auth/refresh | `auth.service.refresh` | axios interceptor | 1 |
| 2.5 | Khoá sau N lần sai | — | middleware + lock logic | — | 1 |
| 3.1 | Check-in/out | POST /attendance/punch | `attendance.controller.punch` | `PunchPage` | 3 |
| 3.2 | Xem bảng chấm công | GET /attendance | `attendance.controller.list` | `AttendanceCalendar` | 3 |
| 3.3 | Chỉnh sửa chấm công | PUT /attendance/:id | `attendance.controller.update` | `AdminAttendancePage` | 3 |
| 3.4 | Yêu cầu bổ sung | POST /requests | `requests.service.create` | `RequestsView` | 4 |
| 3.5 | Duyệt yêu cầu | PATCH /requests/:id/approve | `requests.service.approve` | `RequestApprovalPage` | 4 |
| 3.6 | Nghỉ phép | POST /requests (LEAVE) | `requests.service.create` | `RequestsView` | 4 |
| 3.7 | Cấu hình ca | CRUD /shifts | `shifts.*` | `ShiftsPage` | 3 |
| 3.8 | Cấu hình địa điểm | CRUD /locations | `locations.*` | `LocationsPage` | 3 |
| 4.1 | Xem bảng lương | GET /payrolls | `payroll.controller.list` | `PayrollListPage` | 5 |
| 4.2 | Tính lương | POST /payrolls/generate | `payroll.service.generateMonthly` | — | 5 |
| 4.3 | Sửa bảng lương | PUT /payrolls/:id | `payroll.controller.update` | `PayrollDetailPage` | 5 |
| 4.4 | Manager xác nhận | PATCH /payrolls/:id/manager-approve | `payroll.service.managerApprove` | `PayrollDetailPage` | 5 |
| 4.5 | NV xác nhận | PATCH /payrolls/:id/employee-confirm | `payroll.service.employeeConfirm` | `PayrollDetailPage` | 5 |
| 4.6 | Xuất file | GET /payrolls/:id/export | `payroll.controller.export` | nút Download | 5 |
| 4.7 | Liên kết chấm công | — | `payroll.service.generateMonthly` dùng attendances | — | 5 |
| 5.1 | Lập báo cáo | POST /reports/generate | `reports.service.generate` | `ReportGeneratePage` | 6 |
| 5.2 | Xem báo cáo | GET /reports/:id | `reports.controller.get` | `ReportListPage` | 6 |
| 5.3 | In/Xuất báo cáo | GET /reports/:id/download | `reports.controller.download` | `ReportListPage` | 6 |

---

## 9. Rủi ro & Cách giảm thiểu

| Rủi ro | Tác động | Giảm thiểu |
|--------|----------|------------|
| GPS sai/giả mạo | Chấm công gian lận | Cross-check IP, có thể yêu cầu ảnh selfie (v2) |
| Timezone sai | Lương tính sai ngày | Tất cả DATETIME lưu UTC, convert ở FE; set `time_zone='+07:00'` session MySQL |
| Tính lương đồng thời 2 lần | Bảng lương trùng | UNIQUE key + transaction + lock row |
| Email reset token bị intercept | Chiếm tài khoản | Token hash trong DB, một lần dùng, hết hạn 1h, rate-limit forgot |
| DB lớn khi nhiều tháng | API chậm | Index đủ, pagination mặc định 20, aggregate view riêng cho report |
| User xoá nhầm | Mất dữ liệu | Soft delete + audit + nút restore cho admin |
| Lỗi cron bỏ lỡ 1 ngày | Chấm công trống | Rollup idempotent theo ngày, trang admin có nút "Chạy lại" |

---

## 10. Checklist bàn giao

- [ ] Source code BE + FE + migrations
- [ ] `docker-compose.yml` chạy 1 lệnh
- [ ] `.env.example` đầy đủ biến
- [ ] `README.md` có hướng dẫn cài, tài khoản demo
- [ ] Swagger UI `/api/docs`
- [ ] Test coverage ≥ 60% cho service layer
- [ ] E2E 3 flow chính pass
- [ ] Tài liệu KLTN: sơ đồ ERD, sơ đồ use case, sơ đồ luồng chấm công→lương, screenshot tất cả màn hình
- [ ] Video demo 5–10'

---

*Tổng thời lượng ước tính: **~8 tuần** với 1 dev full-time (hoặc 5–6 tuần nếu 2 dev BE/FE song song).*
