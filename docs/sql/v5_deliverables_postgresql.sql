-- =============================================================================
-- PMS v5: Deliverable Management Schema (PostgreSQL)
-- Date: 2026-04-21
-- Description: Adds Deliverable Type, Workflow, Deliverable, and linking tables
-- =============================================================================

-- 1. Deliverable Types (admin-managed)
CREATE TABLE IF NOT EXISTS pms_deliverable_types (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 2. Custom field definitions per Deliverable Type
CREATE TABLE IF NOT EXISTS pms_deliverable_type_fields (
    id           BIGSERIAL PRIMARY KEY,
    type_id      BIGINT NOT NULL REFERENCES pms_deliverable_types(id) ON DELETE CASCADE,
    field_name   VARCHAR(100) NOT NULL,
    field_type   VARCHAR(20)  NOT NULL DEFAULT 'TEXT', -- TEXT, DATE, SELECT, NUMBER
    field_options TEXT,        -- JSON array of strings for SELECT type, e.g. ["Option A","Option B"]
    field_order  INT DEFAULT 0
);

-- 3. Workflow templates (independent menu item)
CREATE TABLE IF NOT EXISTS pms_workflows (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 4. Workflow steps (ordered sequence)
CREATE TABLE IF NOT EXISTS pms_workflow_steps (
    id          BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL REFERENCES pms_workflows(id) ON DELETE CASCADE,
    step_name   VARCHAR(100) NOT NULL,
    step_order  INT NOT NULL DEFAULT 1,
    description VARCHAR(500)
);

-- 5. Deliverable master table (independent entity)
CREATE TABLE IF NOT EXISTS pms_deliverables (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    type_id     BIGINT REFERENCES pms_deliverable_types(id) ON DELETE SET NULL,
    description TEXT,
    created_by  BIGINT,  -- references pms_users.id (no FK to allow flexibility)
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 6. Custom field values per deliverable
CREATE TABLE IF NOT EXISTS pms_deliverable_field_values (
    id             BIGSERIAL PRIMARY KEY,
    deliverable_id BIGINT NOT NULL REFERENCES pms_deliverables(id) ON DELETE CASCADE,
    field_def_id   BIGINT NOT NULL REFERENCES pms_deliverable_type_fields(id) ON DELETE CASCADE,
    field_value    TEXT,
    UNIQUE (deliverable_id, field_def_id)
);

-- 7. Activity <-> Deliverable many-to-many (cross-project/phase/task)
CREATE TABLE IF NOT EXISTS pms_activity_deliverables (
    id             BIGSERIAL PRIMARY KEY,
    target_type    VARCHAR(20)  NOT NULL,  -- 'PROJECT', 'PHASE', 'TASK'
    target_id      VARCHAR(100) NOT NULL,  -- ID of the activity
    deliverable_id BIGINT NOT NULL REFERENCES pms_deliverables(id) ON DELETE CASCADE,
    created_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE (target_type, target_id, deliverable_id)
);

-- 8. Deliverable <-> Workflow many-to-many with step progress tracking
CREATE TABLE IF NOT EXISTS pms_deliverable_workflows (
    id              BIGSERIAL PRIMARY KEY,
    deliverable_id  BIGINT NOT NULL REFERENCES pms_deliverables(id) ON DELETE CASCADE,
    workflow_id     BIGINT NOT NULL REFERENCES pms_workflows(id) ON DELETE CASCADE,
    current_step_id BIGINT REFERENCES pms_workflow_steps(id) ON DELETE SET NULL,
    started_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (deliverable_id, workflow_id)
);

-- 9. Workflow step audit/history log
CREATE TABLE IF NOT EXISTS pms_deliverable_workflow_log (
    id                      BIGSERIAL PRIMARY KEY,
    deliverable_workflow_id BIGINT NOT NULL REFERENCES pms_deliverable_workflows(id) ON DELETE CASCADE,
    step_id                 BIGINT REFERENCES pms_workflow_steps(id) ON DELETE SET NULL,
    action                  VARCHAR(20) NOT NULL,  -- 'APPROVE', 'REJECT', 'START'
    action_by               BIGINT,  -- user id
    action_at               TIMESTAMP DEFAULT NOW(),
    comments                VARCHAR(1000)
);

-- =============================================================================
-- Indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_del_type_fields_type_id   ON pms_deliverable_type_fields(type_id);
CREATE INDEX IF NOT EXISTS idx_wf_steps_workflow_id      ON pms_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_type_id      ON pms_deliverables(type_id);
CREATE INDEX IF NOT EXISTS idx_del_field_vals_del_id     ON pms_deliverable_field_values(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_activity_del_target       ON pms_activity_deliverables(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_activity_del_del_id       ON pms_activity_deliverables(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_del_workflows_del_id      ON pms_deliverable_workflows(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_del_workflows_wf_id       ON pms_deliverable_workflows(workflow_id);
CREATE INDEX IF NOT EXISTS idx_del_wf_log_dwf_id         ON pms_deliverable_workflow_log(deliverable_workflow_id);

-- =============================================================================
-- Sample seed data (optional, for testing)
-- =============================================================================
-- INSERT INTO pms_deliverable_types (name, description) VALUES
--   ('Report', '報告類交付物'),
--   ('Spec', '規格書類交付物'),
--   ('Test Plan', '測試計畫類交付物');
--
-- INSERT INTO pms_workflows (name, description) VALUES
--   ('Standard Review', '標準審核流程：Draft → Review → Approved'),
--   ('Quick Approval', '快速核准：Submit → Approved');
