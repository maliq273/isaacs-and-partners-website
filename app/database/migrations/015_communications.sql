CREATE TABLE IF NOT EXISTS communications (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    matter_id TEXT,
    user_id TEXT,
    communication_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    recipient TEXT,
    sender TEXT,
    subject TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    external_reference TEXT,
    metadata TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (matter_id)
        REFERENCES matters(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_communications_client_id
    ON communications(client_id);

CREATE INDEX IF NOT EXISTS idx_communications_matter_id
    ON communications(matter_id);

CREATE INDEX IF NOT EXISTS idx_communications_user_id
    ON communications(user_id);

CREATE INDEX IF NOT EXISTS idx_communications_type
    ON communications(communication_type);

CREATE INDEX IF NOT EXISTS idx_communications_status
    ON communications(status);

CREATE INDEX IF NOT EXISTS idx_communications_sent_at
    ON communications(sent_at);
