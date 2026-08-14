CREATE TRIGGER IF NOT EXISTS trg_matter_timeline_created
AFTER INSERT ON matters
FOR EACH ROW
BEGIN
    INSERT INTO timeline_entries (
        id,
        matter_id,
        client_id,
        event_type,
        title,
        description,
        source,
        reference_id,
        occurred_at
    )
    VALUES (
        lower(hex(randomblob(16))),
        NEW.id,
        NEW.client_id,
        'MATTER_CREATED',
        'Matter created',
        NEW.title,
        'database',
        NEW.id,
        COALESCE(
            NEW.opened_at,
            NEW.created_at,
            CURRENT_TIMESTAMP
        )
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_matter_status_timeline
AFTER UPDATE OF status ON matters
FOR EACH ROW
WHEN OLD.status <> NEW.status
BEGIN
    INSERT INTO timeline_entries (
        id,
        matter_id,
        client_id,
        event_type,
        title,
        description,
        source,
        reference_id,
        occurred_at
    )
    VALUES (
        lower(hex(randomblob(16))),
        NEW.id,
        NEW.client_id,
        'MATTER_STATUS_CHANGED',
        'Matter status changed',
        OLD.status || ' → ' || NEW.status,
        'database',
        NEW.id,
        CURRENT_TIMESTAMP
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_status_timeline
AFTER UPDATE OF status ON workflows
FOR EACH ROW
WHEN OLD.status <> NEW.status
BEGIN
    INSERT INTO timeline_entries (
        id,
        matter_id,
        event_type,
        title,
        description,
        source,
        reference_id,
        occurred_at
    )
    VALUES (
        lower(hex(randomblob(16))),
        NEW.matter_id,
        'WORKFLOW_STATUS_CHANGED',
        'Workflow status changed',
        OLD.status || ' → ' || NEW.status,
        'database',
        NEW.id,
        CURRENT_TIMESTAMP
    );
END;
