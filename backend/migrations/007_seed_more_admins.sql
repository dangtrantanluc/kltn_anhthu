-- ============================================================
-- 007_seed_more_admins.sql
--
-- Seed NHIỀU tài khoản ADMIN dự phòng cho dev/KLTN + unlock mọi
-- tài khoản ADMIN đang bị khoá do nhập sai nhiều lần.
--
-- Tất cả hash dưới đây đã được verify bằng bcrypt.compareSync
-- NGAY TẠI THỜI ĐIỂM tạo migration này.
--
-- Danh sách tài khoản:
--   admin / admin
--   test  / test
--   demo  / demo
--   root  / root
-- ============================================================

-- ─── Reset mọi lock hiện tại trên tài khoản ADMIN ──────────
UPDATE users
SET failed_login_count = 0,
    locked_until       = NULL
WHERE role = 'ADMIN';

-- ─── Upsert 4 tài khoản demo ───────────────────────────────
INSERT INTO users
  (employee_code, email, password_hash, full_name, role,
   department_id, position_id, shift_id, is_active)
VALUES
  ('ADMIN1', 'admin',
   '$2b$12$4Q8LzpBd2Y0NVg.wF58Vi.XAsUf/WCRStUwQo.mhMre15.c9jrfzu',
   'Administrator', 'ADMIN', 1, 1, 1, 1),
  ('ADMIN2', 'test',
   '$2b$12$CRxAKomRQY7OpXkqR719rOxooPz.vCFWy9UhLPlC9aqN.ZdhkFNu2',
   'Test Admin', 'ADMIN', 1, 1, 1, 1),
  ('ADMIN3', 'demo',
   '$2b$12$Ok4g6rB.csHgn5rt3f/rGerj6Bzia3jytDGEZNbMMh.2NyxD0sXby',
   'Demo Admin', 'ADMIN', 1, 1, 1, 1),
  ('ADMIN4', 'root',
   '$2b$12$d.I/tephVgYOZY.SozEHJehWEEANx3li/2nJxC6whKW5On2zmmyvy',
   'Root Admin', 'ADMIN', 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE
  password_hash      = VALUES(password_hash),
  role               = 'ADMIN',
  is_active          = 1,
  failed_login_count = 0,
  locked_until       = NULL;
