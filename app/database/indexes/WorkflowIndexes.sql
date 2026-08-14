CREATE INDEX IF NOT EXISTS idx_workflows_matter_id
ON workflows(matter_id);

CREATE INDEX IF NOT EXISTS idx_workflows_status
ON workflows(status);

CREATE INDEX IF NOT EXISTS idx_workflows_type
ON workflows(type);

CREATE INDEX IF NOT EXISTS idx_workflows_current_step
ON workflows(current_step);

CREATE INDEX IF NOT EXISTS idx_workflows_assigned_to
ON workflows(assigned_to);

CREATE INDEX IF NOT EXISTS idx_workflows_created_at
ON workflows(created_at);
