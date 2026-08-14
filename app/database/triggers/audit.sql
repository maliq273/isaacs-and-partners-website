CREATE TRIGGER IF NOT EXISTS trg_client_audit_insert
AFTER INSERT ON clients
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        id,
        client_id,
        event_type,
        entity_type,
        entity_id,
        action,
        description,
        new_values
    )
    VALUES (
        lower(hex(randomblob(16))),
        NEW.id,
        'CLIENT_CREATED',
        'client',
        NEW.id,
        'CREATE',
        'Client record created',
        json_object(
            'first_name', NEW.first_name,
            'last_name', NEW.last_name,
            'email', NEW.email,
            'status', NEW.status
        )
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_matter_audit_insert
AFTER INSERT ON matters
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        id,
        client_id,
        matter_id,
        event_type,
        entity_type,
        entity_id,
        action,
        description,
        new_values
    )
    VALUES (
        lower(hex(randomblob(16))),
        NEW.client_id,
        NEW.id,
        'MATTER_CREATED',
        'matter',
        NEW.id,
        'CREATE',
        'Matter created',
        json_object(
            'reference_number',
            NEW.reference_number,
            'type',
            NEW.type,
            'department',
            NEW.department,
            'status',
            NEW.status
        )
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_document_audit_insert
AFTER INSERT ON documents
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        id,
        client_id,
        matter_id,
        event_type,
        entity_type,
        entity_id,
        action,
        description,
        new_values
    )
    VALUES (
        lower(hex(randomblob(16))),
        NEW.client_id,
        NEW.matter_id,
        'DOCUMENT_UPLOADED',
        'document',
        NEW.id,
        'CREATE',
        'Document uploaded',
        json_object(
            'document_type',
            NEW.document_type,
            'file_name',
            NEW.file_name,
            'status',
            NEW.status
        )
    );
END;
