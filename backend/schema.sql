-- ============================================================
-- HRIS Database Schema (v2 — Production Schema)
-- ============================================================

CREATE DATABASE IF NOT EXISTS hris_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hris_db;

-- ============================================================
-- 1. CƠ CẤU TỔ CHỨC & DANH MỤC
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã phòng ban (VD: IT, HR)',
  name        VARCHAR(100) NOT NULL,
  manager_id  BIGINT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã chức vụ (VD: DEV_SENIOR)',
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  shift_name          VARCHAR(100) NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  allowed_late_mins   INT NOT NULL DEFAULT 0 COMMENT 'Số phút cho phép đi muộn',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed: Ca hành chính mặc định
INSERT IGNORE INTO shifts (shift_name, start_time, end_time, allowed_late_mins)
VALUES ('Ca Hành Chính', '08:00:00', '17:00:00', 0);

-- ============================================================
-- 2. THÔNG TIN NHÂN SỰ
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_code       VARCHAR(50) UNIQUE COMMENT 'Mã NV đồng bộ với máy chấm công',
  email               VARCHAR(255) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  full_name           VARCHAR(100) NOT NULL,
  role                VARCHAR(50) NOT NULL DEFAULT 'USER' COMMENT 'Enum: ADMIN, HR, MANAGER, USER',
  gender              VARCHAR(10)  COMMENT 'Enum: MALE, FEMALE, OTHER',
  birthdate           DATETIME,
  manager_id          BIGINT       COMMENT 'Quản lý trực tiếp',
  department_id       BIGINT,
  position_id         BIGINT,
  shift_id            BIGINT,
  base_hourly_wage    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  salary_multiplier   DECIMAL(4,2)  NOT NULL DEFAULT 1.00,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (position_id)   REFERENCES positions(id),
  FOREIGN KEY (shift_id)      REFERENCES shifts(id)
  -- manager_id and departments.manager_id are deferred to avoid circular FK issues at creation
);

-- Post-creation circular FKs
ALTER TABLE users
  ADD CONSTRAINT fk_users_manager
    FOREIGN KEY (manager_id) REFERENCES users(id)
    ON DELETE SET NULL;

ALTER TABLE departments
  ADD CONSTRAINT fk_dept_manager
    FOREIGN KEY (manager_id) REFERENCES users(id)
    ON DELETE SET NULL;

-- ============================================================
-- 3. LUỒNG CHẤM CÔNG VÀ XỬ LÝ DỮ LIỆU
-- ============================================================

CREATE TABLE IF NOT EXISTS punch_logs (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_code   VARCHAR(50) NOT NULL COMMENT 'Map với users.employee_code',
  punch_time      DATETIME NOT NULL,
  punch_type      VARCHAR(20) NOT NULL COMMENT 'Enum: IN, OUT, UNKNOWN',
  device_id       VARCHAR(100),
  is_processed    BOOLEAN DEFAULT FALSE COMMENT 'Đã tổng hợp lên bảng attendances chưa?',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_punch_anti_spam (employee_code, punch_time)
);

CREATE TABLE IF NOT EXISTS attendances (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id             BIGINT NOT NULL,
  work_date           DATE NOT NULL,
  check_in_time       DATETIME,
  check_out_time      DATETIME,
  late_mins           INT NOT NULL DEFAULT 0,
  early_leave_mins    INT NOT NULL DEFAULT 0,
  total_worked_hours  DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  status              VARCHAR(50) NOT NULL COMMENT 'Enum: PRESENT, LATE, MISSING_CHECKOUT, ABSENT',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user_date_attendance (user_id, work_date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 4. QUẢN LÝ ĐƠN TỪ & TÍNH LƯƠNG
-- ============================================================

CREATE TABLE IF NOT EXISTS requests (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id               BIGINT NOT NULL,
  request_type          VARCHAR(50) NOT NULL COMMENT 'Enum: LEAVE_REQUEST, MISSING_PUNCH',
  leave_type            VARCHAR(50)  COMMENT 'Enum: PAID, UNPAID',
  target_date           DATE NOT NULL,
  requested_check_in    TIME,
  requested_check_out   TIME,
  reason                TEXT NOT NULL,
  status                VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'Enum: PENDING, APPROVED, REJECTED',
  reviewer_id           BIGINT,
  reject_reason         TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payrolls (
  id                            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id                       BIGINT NOT NULL,
  payroll_month                 INT NOT NULL,
  payroll_year                  INT NOT NULL,
  total_actual_hours            DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  total_paid_leave_hours        DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  base_hourly_wage_snapshot     DECIMAL(15,2) NOT NULL,
  salary_multiplier_snapshot    DECIMAL(4,2)  NOT NULL,
  total_calculated_salary       DECIMAL(15,2) NOT NULL,
  status                        VARCHAR(50) NOT NULL DEFAULT 'DRAFT' COMMENT 'Enum: DRAFT, MANAGER_APPROVED, USER_CONFIRMED',
  created_at                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user_month_payroll (user_id, payroll_month, payroll_year),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- Seed: Default Admin User
-- password: Admin@123  (bcrypt hash, cost 12)
-- ============================================================
INSERT IGNORE INTO departments (code, name) VALUES ('ADMIN', 'Administration');

INSERT IGNORE INTO positions (code, name) VALUES ('ADMIN', 'System Administrator');

INSERT IGNORE INTO users
  (employee_code, email, password_hash, full_name, role, department_id, position_id, shift_id)
VALUES (
  'EMP000',
  'admin@hris.com',
  '$2a$12$K8GpNvF./WCv3Bc9srtl6ed/xN1wr4hoPEfVq/XoMdKs.e9fcSLYC',
  'System Admin',
  'ADMIN',
  1, -- departments.id = 1
  1, -- positions.id = 1
  1  -- shifts.id = 1
);
