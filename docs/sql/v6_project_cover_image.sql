-- v6: Add cover_image_path to PMS_PROJECTS
-- Run against Oracle or PostgreSQL databases.
-- H2 (default profile) is auto-updated by Hibernate DDL.

-- Oracle
ALTER TABLE PMS_PROJECTS ADD cover_image_path VARCHAR2(500);

-- PostgreSQL
-- ALTER TABLE pms_projects ADD COLUMN cover_image_path VARCHAR(500);
