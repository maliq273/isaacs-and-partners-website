CREATE VIEW IF NOT EXISTS vw_communication_overview AS
SELECT
    c.id,
    c.communication_type,
    c.direction,
    c.recipient,
    c.sender,
    c.subject,
    c.message,
    c.status,
    c.external_reference,
    c.metadata,
    c.sent_at,
    c.created_at,
    c.updated_at,

    c.client_id,
    TRIM(
        COALESCE(cl.first_name, '') || ' ' ||
        COALESCE(cl.last_name, '')
    ) AS client_name,

    c.matter_id,
    m.reference_number AS matter_reference,

    c.user_id,
    TRIM(
        COALESCE(u.first_name, '') || ' ' ||
        COALESCE(u.last_name, '')
    ) AS user_name

FROM communications c

LEFT JOIN clients cl
    ON cl.id = c.client_id

LEFT JOIN matters m
    ON m.id = c.matter_id

LEFT JOIN users u
    ON u.id = c.user_id;
