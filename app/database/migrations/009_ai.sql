CREATE TABLE IF NOT EXISTS ai_interactions (
    id TEXT PRIMARY KEY,
    matter_id TEXT,
    client_id TEXT,
    user_id TEXT,
    interaction_type TEXT NOT NULL,
    model TEXT,
    prompt TEXT,
    response TEXT,
    confidence REAL,
    status TEXT NOT NULL DEFAULT 'completed',
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (matter_id)
        REFERENCES matters(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CHECK (
        confidence IS NULL
        OR (
            confidence >= 0
            AND confidence <= 1
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_matter_id
    ON ai_interactions(matter_id);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_client_id
    ON ai_interactions(client_id);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id
    ON ai_interactions(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_type
    ON ai_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at
    ON ai_interactions(created_at);
