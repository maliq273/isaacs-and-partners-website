CREATE TRIGGER IF NOT EXISTS trg_client_delete_guard
BEFORE DELETE ON clients
FOR EACH ROW
WHEN EXISTS (
    SELECT 1
    FROM matters
    WHERE client_id = OLD.id
)
BEGIN
    SELECT RAISE(
        ABORT,
        'Client cannot be deleted while matters exist'
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_matter_delete_guard
BEFORE DELETE ON matters
FOR EACH ROW
WHEN EXISTS (
    SELECT 1
    FROM documents
    WHERE matter_id = OLD.id
)
BEGIN
    SELECT RAISE(
        ABORT,
        'Matter cannot be deleted while documents exist'
    );
END;
