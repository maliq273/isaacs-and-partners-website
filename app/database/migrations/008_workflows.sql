CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    matter_id TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    current_step TEXT,
    assigned_to TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (matter_id)
        REFERENCES matters(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workflows_matter_id
    ON workflows(matter_id);

CREATE INDEX IF NOT EXISTS idx_workflows_type
    ON workflows(type);

CREATE INDEX IF NOT EXISTS idx_workflows_status
    ON workflows(status);

CREATE INDEX IF NOT EXISTS idx_workflows_current_step
    ON workflows(current_step);

CREATE INDEX IF NOT EXISTS idx_workflows_assigned_to
    ON workflows(assigned_to);
