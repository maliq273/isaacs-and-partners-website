CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
