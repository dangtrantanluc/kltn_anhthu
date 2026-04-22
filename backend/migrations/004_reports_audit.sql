-- ============================================================
-- 004_reports_audit.sql
-- Module báo cáo + Audit log xuyên suốt hệ thống
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_by     BIGINT NOT NULL,
  report_type    VARCHAR(50) NOT NULL COMMENT 'ATTENDANCE_SUMMARY | PAYROLL_SUMMARY | HEADCOUNT | LEAVE_SUMMARY',
  title          VARCHAR(255),
  period_from    DATE NOT NULL,
  period_to      DATE NOT NULL,
  department_id  BIGINT NULL,
  params_json    JSON NULL,
  summary_json   JSON NULL COMMENT 'Kết quả aggregate để hiển thị nhanh',
  file_path      VARCHAR(500) NULL,
  file_format    VARCHAR(10) NULL COMMENT 'PDF | XLSX',
  row_count      INT NOT NULL DEFAULT 0,
  status         VARCHAR(20) NOT NULL DEFAULT 'GENERATED' COMMENT 'GENERATED | EMPTY | FAILED',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_reports_creator (created_by, created_at),
  INDEX idx_reports_type (report_type, period_from, period_to),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id     BIGINT NULL,
  action       VARCHAR(100) NOT NULL COMMENT 'USER_CREATE, PAYROLL_APPROVE, ATTENDANCE_EDIT...',
  entity       VARCHAR(50) NULL,
  entity_id    BIGINT NULL,
  diff_json    JSON NULL,
  ip           VARCHAR(45) NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_actor_created (actor_id, created_at),
  INDEX idx_audit_entity (entity, entity_id),
  INDEX idx_audit_action (action, created_at),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
