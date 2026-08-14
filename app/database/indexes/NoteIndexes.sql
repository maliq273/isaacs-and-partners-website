CREATE INDEX IF NOT EXISTS idx_notes_matter_id
ON notes(matter_id);

CREATE INDEX IF NOT EXISTS idx_notes_client_id
ON notes(client_id);

CREATE INDEX IF NOT EXISTS idx_notes_created_by
ON notes(created_by);

CREATE INDEX IF NOT EXISTS idx_notes_created_at
ON notes(created_at);
