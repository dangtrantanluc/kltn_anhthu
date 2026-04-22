-- ============================================================
-- 003_locations.sql
-- Địa điểm chấm công (office, chi nhánh) + GPS fields cho punch_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  address      VARCHAR(255),
  latitude     DECIMAL(10,7) NOT NULL,
  longitude    DECIMAL(10,7) NOT NULL,
  radius_m     INT NOT NULL DEFAULT 100 COMMENT 'Bán kính cho phép chấm công (m)',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Thêm cột GPS vào punch_logs (idempotent) ────────────
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='punch_logs' AND COLUMN_NAME='latitude');
SET @sql := IF(@col=0,
  'ALTER TABLE punch_logs ADD COLUMN latitude DECIMAL(10,7) NULL',
  'SELECT "latitude exists"');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='punch_logs' AND COLUMN_NAME='longitude');
SET @sql := IF(@col=0,
  'ALTER TABLE punch_logs ADD COLUMN longitude DECIMAL(10,7) NULL',
  'SELECT "longitude exists"');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='punch_logs' AND COLUMN_NAME='location_id');
SET @sql := IF(@col=0,
  'ALTER TABLE punch_logs ADD COLUMN location_id BIGINT NULL',
  'SELECT "location_id exists"');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── Seed location mặc định ──────────────────────────────
INSERT IGNORE INTO locations (id, name, address, latitude, longitude, radius_m)
VALUES (1, 'Văn phòng chính', 'TP. Hồ Chí Minh', 10.7769000, 106.7009000, 150);
