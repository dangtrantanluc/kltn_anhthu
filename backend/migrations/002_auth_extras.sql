-- ============================================================
-- 002_auth_extras.sql
-- Hỗ trợ: refresh token xoay vòng, quên/đặt lại mật khẩu,
-- khoá tài khoản sau N lần sai.
-- ============================================================

-- ─── Refresh tokens ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  token_hash    VARCHAR(255) NOT NULL UNIQUE,
  user_agent    VARCHAR(255),
  ip            VARCHAR(45),
  expires_at    DATETIME NOT NULL,
  revoked_at    DATETIME NULL,
  replaced_by   BIGINT NULL COMMENT 'id của token thay thế khi rotate',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rt_user (user_id),
  INDEX idx_rt_expires (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Password resets ────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  token_hash    VARCHAR(255) NOT NULL,
  expires_at    DATETIME NOT NULL,
  used_at       DATETIME NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_token (token_hash),
  INDEX idx_pr_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Lock fields on users (idempotent add) ──────────────
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='failed_login_count');
SET @sql := IF(@col=0,
  'ALTER TABLE users ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0',
  'SELECT "failed_login_count exists"');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='locked_until');
SET @sql := IF(@col=0,
  'ALTER TABLE users ADD COLUMN locked_until DATETIME NULL',
  'SELECT "locked_until exists"');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='last_login_at');
SET @sql := IF(@col=0,
  'ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL',
  'SELECT "last_login_at exists"');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
