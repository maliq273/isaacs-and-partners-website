CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    matter_id TEXT,
    document_type TEXT NOT NULL,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    file_hash TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded',
    expiry_date TEXT,
    verified_at TEXT,
    verified_by TEXT,
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

    FOREIGN KEY (verified_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CHECK (file_size >= 0)
);

CREATE INDEX IF NOT EXISTS idx_documents_client_id
    ON documents(client_id);

CREATE INDEX IF NOT EXISTS idx_documents_matter_id
    ON documents(matter_id);

CREATE INDEX IF NOT EXISTS idx_documents_document_type
    ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_documents_status
    ON documents(status);

CREATE INDEX IF NOT EXISTS idx_documents_expiry_date
    ON documents(expiry_date);

CREATE INDEX IF NOT EXISTS idx_documents_file_hash
    ON documents(file_hash);
