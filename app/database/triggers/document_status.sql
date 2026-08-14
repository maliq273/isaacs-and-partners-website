CREATE TRIGGER IF NOT EXISTS trg_document_verified
AFTER UPDATE OF status ON documents
FOR EACH ROW
WHEN NEW.status = 'verified'
AND OLD.status <> 'verified'
BEGIN
    UPDATE documents
    SET verified_at = COALESCE(
        verified_at,
        CURRENT_TIMESTAMP
    )
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_document_unverified
AFTER UPDATE OF status ON documents
FOR EACH ROW
WHEN NEW.status <> 'verified'
AND OLD.status = 'verified'
BEGIN
    UPDATE documents
    SET verified_at = NULL,
        verified_by = NULL
    WHERE id = NEW.id;
END;
