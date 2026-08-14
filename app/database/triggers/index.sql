CREATE INDEX IF NOT EXISTS idx_timeline_matter_occurred
    ON timeline_entries(
        matter_id,
        occurred_at
    );

CREATE INDEX IF NOT EXISTS idx_audit_entity_created
    ON audit_logs(
        entity_type,
        entity_id,
        created_at
    );

CREATE INDEX IF NOT EXISTS idx_communications_matter_sent
    ON communications(
        matter_id,
        sent_at
    );

CREATE INDEX IF NOT EXISTS idx_documents_matter_status
    ON documents(
        matter_id,
        status
    );
