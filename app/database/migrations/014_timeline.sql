CREATE TABLE IF NOT EXISTS timeline_entries (
    id TEXT PRIMARY KEY,
    matter_id TEXT NOT NULL,
    client_id TEXT,
    user_id TEXT,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT,
    reference_id TEXT,
    metadata TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (matter_id)
        REFERENCES matters(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_timeline_matter_id
    ON timeline_entries(matter_id);

CREATE INDEX IF NOT EXISTS idx_timeline_client_id
    ON timeline_entries(client_id);

CREATE INDEX IF NOT EXISTS idx_timeline_occurred_at
    ON timeline_entries(occurred_at);

CREATE INDEX IF NOT EXISTS idx_timeline_event_type
    ON timeline_entries(event_type);
