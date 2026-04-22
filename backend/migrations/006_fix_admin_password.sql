-- ============================================================
-- 006_fix_admin_password.sql
-- Khắc phục: hash trong 001_init.sql không match password "Admin@123"
-- như comment. Reset lại mật khẩu cho tài khoản admin@hris.com
-- về đúng "Admin@123" (bcrypt cost 12).
-- Bonus: clear locked_until + failed_login_count nếu bị khoá do gõ sai.
-- ============================================================

UPDATE users
SET
  password_hash      = '$2b$12$k9POIsCV5OfFvlUHpWT7f.ZgpPJ.fcM4vOCtj8A27.14V//zhOjJu',
  failed_login_count = 0,
  locked_until       = NULL
WHERE email = 'admin@hris.com';
