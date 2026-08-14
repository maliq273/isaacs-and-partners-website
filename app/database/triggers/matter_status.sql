CREATE TRIGGER IF NOT EXISTS trg_matter_closed_at
AFTER UPDATE OF status ON matters
FOR EACH ROW
WHEN NEW.status IN (
    'closed',
    'completed',
    'resolved'
)
AND OLD.status NOT IN (
    'closed',
    'completed',
    'resolved'
)
BEGIN
    UPDATE matters
    SET closed_at = COALESCE(
        closed_at,
        CURRENT_TIMESTAMP
    )
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_matter_reopened
AFTER UPDATE OF status ON matters
FOR EACH ROW
WHEN NEW.status NOT IN (
    'closed',
    'completed',
    'resolved'
)
AND OLD.status IN (
    'closed',
    'completed',
    'resolved'
)
BEGIN
    UPDATE matters
    SET closed_at = NULL
    WHERE id = NEW.id;
END;
