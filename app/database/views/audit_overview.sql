CREATE VIEW IF NOT EXISTS vw_audit_overview AS
SELECT
    a.id,
    a.event_type,
    a.entity_type,
    a.entity_id,
    a.action,
    a.description,
    a.old_values,
    a.new_values,
    a.ip_address,
    a.user_agent,
    a.metadata,
    a.created_at,

    a.user_id,
    TRIM(
        COALESCE(u.first_name, '') || ' ' ||
        COALESCE(u.last_name, '')
    ) AS user_name,

    a.client_id,
    TRIM(
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '')
    ) AS client_name,

    a.matter_id,
    m.reference_number AS matter_reference

FROM audit_logs a

LEFT JOIN users u
    ON u.id = a.user_id

LEFT JOIN clients c
    ON c.id = a.client_id

LEFT JOIN matters m
    ON m.id = a.matter_id;
