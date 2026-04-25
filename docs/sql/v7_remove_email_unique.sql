-- v7: Remove unique constraint on PMS_USERS.email
-- The JPA entity has no unique=true on email, but the DB-level constraint
-- may still exist from a previous Hibernate DDL run.

-- ── Step 1: Find the constraint name ─────────────────────────────────────

-- Oracle:
SELECT uc.constraint_name
FROM user_constraints uc
JOIN user_cons_columns ucc ON uc.constraint_name = ucc.constraint_name
WHERE uc.table_name    = 'PMS_USERS'
  AND uc.constraint_type = 'U'
  AND ucc.column_name  = 'EMAIL';

-- PostgreSQL:
-- SELECT tc.constraint_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.constraint_column_usage ccu
--      ON tc.constraint_name = ccu.constraint_name
-- WHERE tc.table_name       = 'pms_users'
--   AND tc.constraint_type  = 'UNIQUE'
--   AND ccu.column_name     = 'email';

-- ── Step 2: Drop the constraint (replace <constraint_name> with the result above) ──

-- Oracle:
-- ALTER TABLE PMS_USERS DROP CONSTRAINT <constraint_name>;

-- PostgreSQL:
-- ALTER TABLE pms_users DROP CONSTRAINT <constraint_name>;

-- H2 (dev): H2 names unique constraints after the column by default.
-- ALTER TABLE PMS_USERS DROP CONSTRAINT IF EXISTS UK_<hash>_EMAIL;
-- Or drop the underlying unique index:
-- DROP INDEX IF EXISTS UK_<hash>_EMAIL;
