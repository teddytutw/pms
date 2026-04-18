-- ============================================================
-- PMS Task Display Order Migration - PostgreSQL
-- Version: v3 (Add display_order to pms_tasks)
-- ============================================================

ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Initialize display_order with ID to maintain some order initially
UPDATE pms_tasks SET display_order = id WHERE display_order IS NULL;
