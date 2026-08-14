CREATE INDEX IF NOT EXISTS idx_matters_client_id
ON matters(client_id);

CREATE INDEX IF NOT EXISTS idx_matters_status
ON matters(status);

CREATE INDEX IF NOT EXISTS idx_matters_stage
ON matters(stage);

CREATE INDEX IF NOT EXISTS idx_matters_type
ON matters(type);

CREATE INDEX IF NOT EXISTS idx_matters_priority
ON matters(priority);

CREATE INDEX IF NOT EXISTS idx_matters_assigned_to
ON matters(assigned_to);

CREATE INDEX IF NOT EXISTS idx_matters_department
ON matters(department);

CREATE INDEX IF NOT EXISTS idx_matters_created_at
ON matters(created_at);

CREATE INDEX IF NOT EXISTS idx_matters_updated_at
ON matters(updated_at);

CREATE INDEX IF NOT EXISTS idx_matters_reference_number
ON matters(reference_number);
