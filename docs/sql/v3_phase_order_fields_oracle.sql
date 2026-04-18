-- v3_phase_order_fields_oracle.sql
-- Oracle Migration to add display_order to project_phase_gate

ALTER TABLE "PROJECT_PHASE_GATE" ADD "DISPLAY_ORDER" NUMBER(10,0) DEFAULT 0;

-- Update existing records to have a sequential order based on ID
UPDATE "PROJECT_PHASE_GATE" p
SET "DISPLAY_ORDER" = (
    SELECT num FROM (
        SELECT "ID", ROW_NUMBER() OVER (PARTITION BY "PROJECT_ID" ORDER BY "ID" ASC) as num
        FROM "PROJECT_PHASE_GATE"
    ) temp
    WHERE temp."ID" = p."ID"
);
COMMIT;
