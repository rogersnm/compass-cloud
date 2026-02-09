-- Tasks
ALTER TABLE tasks RENAME COLUMN display_id TO key;
ALTER TABLE tasks RENAME COLUMN epic_task_id TO epic_key;

-- Documents
ALTER TABLE documents RENAME COLUMN display_id TO key;

-- Rename indexes
ALTER INDEX tasks_org_display_id_unique RENAME TO tasks_org_key_unique;
ALTER INDEX documents_org_display_id_unique RENAME TO documents_org_key_unique;
