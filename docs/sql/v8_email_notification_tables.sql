-- v8: Email notification tables
-- pms_email_templates  — stores per-rule subject/body templates
-- pms_notification_log — deduplication log for sent notifications

-- ── Oracle ────────────────────────────────────────────────────────────────────

CREATE TABLE pms_email_templates (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_id     VARCHAR2(20)   NOT NULL UNIQUE,
    rule_name   VARCHAR2(100)  NOT NULL,
    subject     VARCHAR2(300)  NOT NULL,
    body        CLOB           NOT NULL,
    enabled     NUMBER(1)      DEFAULT 1 NOT NULL,
    updated_at  TIMESTAMP
);

CREATE TABLE pms_notification_log (
    id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id         NUMBER         NOT NULL,
    rule_id         VARCHAR2(20)   NOT NULL,
    triggered_on    DATE           NOT NULL,
    recipient_email VARCHAR2(100),
    sent_at         TIMESTAMP      NOT NULL,
    success         NUMBER(1)      DEFAULT 1 NOT NULL,
    error_message   VARCHAR2(500),
    CONSTRAINT uq_notif_log UNIQUE (task_id, rule_id, triggered_on)
);

-- ── PostgreSQL ────────────────────────────────────────────────────────────────

-- CREATE TABLE pms_email_templates (
--     id          BIGSERIAL PRIMARY KEY,
--     rule_id     VARCHAR(20)  NOT NULL UNIQUE,
--     rule_name   VARCHAR(100) NOT NULL,
--     subject     VARCHAR(300) NOT NULL,
--     body        TEXT         NOT NULL,
--     enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
--     updated_at  TIMESTAMP
-- );
--
-- CREATE TABLE pms_notification_log (
--     id              BIGSERIAL PRIMARY KEY,
--     task_id         BIGINT       NOT NULL,
--     rule_id         VARCHAR(20)  NOT NULL,
--     triggered_on    DATE         NOT NULL,
--     recipient_email VARCHAR(100),
--     sent_at         TIMESTAMP    NOT NULL,
--     success         BOOLEAN      NOT NULL DEFAULT TRUE,
--     error_message   VARCHAR(500),
--     UNIQUE (task_id, rule_id, triggered_on)
-- );
