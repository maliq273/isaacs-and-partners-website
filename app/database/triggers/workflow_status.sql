CREATE TRIGGER IF NOT EXISTS trg_workflow_started
AFTER UPDATE OF status ON workflows
FOR EACH ROW
WHEN NEW.status IN (
    'active',
    'in_progress',
    'running'
)
AND OLD.status NOT IN (
    'active',
    'in_progress',
    'running'
)
BEGIN
    UPDATE workflows
    SET started_at = COALESCE(
        started_at,
        CURRENT_TIMESTAMP
    )
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_completed
AFTER UPDATE OF status ON workflows
FOR EACH ROW
WHEN NEW.status IN (
    'completed',
    'complete',
    'closed'
)
AND OLD.status NOT IN (
    'completed',
    'complete',
    'closed'
)
BEGIN
    UPDATE workflows
    SET
        completed_at = COALESCE(
            completed_at,
            CURRENT_TIMESTAMP
        )
    WHERE id = NEW.id;
END;
