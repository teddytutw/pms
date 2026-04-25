-- PMS v6: Activity Teams (PostgreSQL)
CREATE TABLE IF NOT EXISTS pms_activity_teams (
    id             BIGSERIAL PRIMARY KEY,
    target_type    VARCHAR(20)  NOT NULL,
    target_id      VARCHAR(100) NOT NULL,
    user_id        BIGINT       NOT NULL,
    responsibility VARCHAR(20)  NOT NULL DEFAULT 'Member',
    created_at     TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_activity_team UNIQUE (target_type, target_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_activity_teams_target ON pms_activity_teams(target_type, target_id);
