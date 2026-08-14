CREATE TRIGGER IF NOT EXISTS trg_communication_sent
AFTER UPDATE OF status ON communications
FOR EACH ROW
WHEN NEW.status = 'sent'
AND OLD.status <> 'sent'
BEGIN
    UPDATE communications
    SET sent_at = COALESCE(
        sent_at,
        CURRENT_TIMESTAMP
    )
    WHERE id = NEW.id;
END;
