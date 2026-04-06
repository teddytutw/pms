-- ============================================================
-- PMS Activity Fields Migration - PostgreSQL
-- Version: v2 (Activity 統一管理欄位)
-- Tables: pms_projects, pms_project_phase_gates, pms_tasks
-- Note: Spring Boot ddl-auto:update will handle most of these
--       automatically. This script is for manual DBA reference.
-- ============================================================

-- ── pms_projects ─────────────────────────────────────────────
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS activity_type VARCHAR(20) DEFAULT 'PROJECT';
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS owner_id BIGINT;
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS responsible_roles VARCHAR(500);
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS planned_duration VARCHAR(50);
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS actual_start_date VARCHAR(50);
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS actual_end_date VARCHAR(50);
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS actual_duration VARCHAR(50);
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS bpm_user_id BIGINT;
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS mipm_user_id BIGINT;
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS sqe_user_id BIGINT;
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS eng_user_id BIGINT;
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS pur_user_id BIGINT;
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS dqa_user_id BIGINT;
ALTER TABLE pms_projects ADD COLUMN IF NOT EXISTS erd_user_id BIGINT;

-- ── pms_project_phase_gates ───────────────────────────────────
ALTER TABLE pms_project_phase_gates ADD COLUMN IF NOT EXISTS activity_type VARCHAR(20) DEFAULT 'PHASE';
ALTER TABLE pms_project_phase_gates ADD COLUMN IF NOT EXISTS owner_id BIGINT;
ALTER TABLE pms_project_phase_gates ADD COLUMN IF NOT EXISTS responsible_roles VARCHAR(500);
ALTER TABLE pms_project_phase_gates ADD COLUMN IF NOT EXISTS planned_start_date VARCHAR(50);
ALTER TABLE pms_project_phase_gates ADD COLUMN IF NOT EXISTS planned_end_date VARCHAR(50);
ALTER TABLE pms_project_phase_gates ADD COLUMN IF NOT EXISTS planned_duration VARCHAR(50);
ALTER TABLE pms_project_phase_gates ADD COLUMN IF NOT EXISTS actual_start_date VARCHAR(50);
ALTER TABLE pms_project_phase_gates ADD COLUMN IF NOT EXISTS actual_end_date VARCHAR(50);
ALTER TABLE pms_project_phase_gates ADD COLUMN IF NOT EXISTS actual_duration VARCHAR(50);

-- ── pms_tasks ────────────────────────────────────────────────
ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS activity_type VARCHAR(20) DEFAULT 'TASK';
ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS owner_id BIGINT;
ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS responsible_roles VARCHAR(500);
ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS planned_duration VARCHAR(50);
ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS actual_duration VARCHAR(50);

-- ── pms_responsible_roles (seed data) ────────────────────────
INSERT INTO pms_responsible_roles (role_name)
SELECT v FROM (VALUES ('BPM'),('MIPM'),('SQE'),('ENG'),('PUR'),('DQA'),('ERD')) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM pms_responsible_roles WHERE role_name = v);
