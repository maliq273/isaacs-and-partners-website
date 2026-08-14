CREATE TRIGGER IF NOT EXISTS trg_task_completed
AFTER UPDATE OF status ON tasks
FOR EACH ROW
WHEN NEW.status IN (
    'completed',
    'complete',
    'done'
)
AND OLD.status NOT IN (
    'completed',
    'complete',
    'done'
)
BEGIN
    UPDATE tasks
    SET completed_at = COALESCE(
        completed_at,
        CURRENT_TIMESTAMP
    )
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_task_reopened
AFTER UPDATE OF status ON tasks
FOR EACH ROW
WHEN NEW.status NOT IN (
    'completed',
    'complete',
    'done'
)
AND OLD.status IN (
    'completed',
    'complete',
    'done'
)
BEGIN
    UPDATE tasks
    SET completed_at = NULL
    WHERE id = NEW.id;
END;
