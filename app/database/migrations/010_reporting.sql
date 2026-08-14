CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    report_type TEXT NOT NULL,
    name TEXT NOT NULL,
    requested_by TEXT,
    parameters TEXT,
    result_location TEXT,
    format TEXT NOT NULL DEFAULT 'pdf',
    status TEXT NOT NULL DEFAULT 'pending',
    generated_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (requested_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_type
    ON reports(report_type);

CREATE INDEX IF NOT EXISTS idx_reports_requested_by
    ON reports(requested_by);

CREATE INDEX IF NOT EXISTS idx_reports_status
    ON reports(status);

CREATE INDEX IF NOT EXISTS idx_reports_generated_at
    ON reports(generated_at);
