CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    matter_id TEXT,
    client_id TEXT,
    user_id TEXT,
    title TEXT,
    content TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'general',
    visibility TEXT NOT NULL DEFAULT 'internal',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (matter_id)
        REFERENCES matters(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_matter_id
    ON notes(matter_id);

CREATE INDEX IF NOT EXISTS idx_notes_client_id
    ON notes(client_id);

CREATE INDEX IF NOT EXISTS idx_notes_user_id
    ON notes(user_id);

CREATE INDEX IF NOT EXISTS idx_notes_created_at
    ON notes(created_at);
