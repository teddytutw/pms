-- v3_phase_order_fields_postgresql.sql
-- PostgreSQL Migration to add display_order to project_phase_gate

ALTER TABLE project_phase_gate ADD COLUMN display_order INT DEFAULT 0;

-- Update existing records to have a sequential order based on ID (optional initialization)
WITH numbered_phases AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id ASC) as num
    FROM project_phase_gate
)
UPDATE project_phase_gate
SET display_order = numbered_phases.num
FROM numbered_phases
WHERE project_phase_gate.id = numbered_phases.id;
