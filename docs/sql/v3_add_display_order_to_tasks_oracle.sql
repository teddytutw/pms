-- ============================================================
-- PMS Task Display Order Migration - Oracle
-- Version: v3 (Add display_order to pms_tasks)
-- ============================================================

ALTER TABLE pms_tasks ADD (display_order NUMBER(10));

-- Initialize display_order with ID
UPDATE pms_tasks SET display_order = id WHERE display_order IS NULL;
COMMIT;
