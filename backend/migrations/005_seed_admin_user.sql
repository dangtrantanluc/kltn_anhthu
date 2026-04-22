-- ============================================================
-- 005_seed_admin_user.sql
-- Tài khoản đăng nhập nhanh cho dev/KLTN:
--   username: admin
--   password: admin
--   role    : ADMIN
--
-- Do cột `email` của bảng users là NOT NULL UNIQUE và không có
-- định dạng bắt buộc, ta lưu luôn chuỗi "admin" vào email để
-- người dùng gõ "admin" ở màn hình đăng nhập.
-- ============================================================

INSERT INTO users
  (employee_code, email, password_hash, full_name, role,
   department_id, position_id, shift_id, is_active)
VALUES (
  'ADMIN',
  'admin',
  -- bcrypt(cost=12) của chuỗi "admin"
  '$2b$12$Hs0jmHsPYO36nGPuVbpSI.Jqd9HuKZWI9qbdlbi9y/iInTLdN9cFq',
  'Administrator',
  'ADMIN',
  1, 1, 1,
  1
)
ON DUPLICATE KEY UPDATE
  password_hash      = VALUES(password_hash),
  role               = 'ADMIN',
  is_active          = 1,
  failed_login_count = 0,
  locked_until       = NULL;
