CREATE TRIGGER IF NOT EXISTS trg_companies_updated_at
AFTER UPDATE ON companies
FOR EACH ROW
BEGIN
    UPDATE companies
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_clients_updated_at
AFTER UPDATE ON clients
FOR EACH ROW
BEGIN
    UPDATE clients
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_matters_updated_at
AFTER UPDATE ON matters
FOR EACH ROW
BEGIN
    UPDATE matters
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_documents_updated_at
AFTER UPDATE ON documents
FOR EACH ROW
BEGIN
    UPDATE documents
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
    UPDATE tasks
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_updated_at
AFTER UPDATE ON notes
FOR EACH ROW
BEGIN
    UPDATE notes
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_workflows_updated_at
AFTER UPDATE ON workflows
FOR EACH ROW
BEGIN
    UPDATE workflows
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_invoices_updated_at
AFTER UPDATE ON invoices
FOR EACH ROW
BEGIN
    UPDATE invoices
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_payments_updated_at
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    UPDATE payments
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_communications_updated_at
AFTER UPDATE ON communications
FOR EACH ROW
BEGIN
    UPDATE communications
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id
      AND updated_at = OLD.updated_at;
END;
