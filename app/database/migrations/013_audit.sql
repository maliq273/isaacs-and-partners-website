CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    matter_id TEXT,
    client_id TEXT,
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    action TEXT NOT NULL,
    description TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (matter_id)
        REFERENCES matters(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id
    ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_matter_id
    ON audit_logs(matter_id);

CREATE INDEX IF NOT EXISTS idx_audit_client_id
    ON audit_logs(client_id);

CREATE INDEX IF NOT EXISTS idx_audit_event_type
    ON audit_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_audit_entity
    ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON audit_logs(created_at);
