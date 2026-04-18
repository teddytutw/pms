-- Oracle SQL
ALTER TABLE PMS_PROJECTS ADD (
    project_year VARCHAR2(10),
    execution_status VARCHAR2(20) DEFAULT 'NOT_STARTED'
);

-- PostgreSQL (for development if applicable)
-- ALTER TABLE PMS_PROJECTS ADD COLUMN project_year VARCHAR(10);
-- ALTER TABLE PMS_PROJECTS ADD COLUMN execution_status VARCHAR(20) DEFAULT 'NOT_STARTED';
