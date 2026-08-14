CREATE INDEX IF NOT EXISTS idx_tasks_matter_id
ON tasks(matter_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
ON tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_tasks_status
ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_priority
ON tasks(priority);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
ON tasks(due_date);
