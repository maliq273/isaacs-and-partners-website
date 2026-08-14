CREATE VIEW IF NOT EXISTS vw_timeline_overview AS
SELECT
    t.id,
    t.event_type,
    t.title,
    t.description,
    t.source,
    t.reference_id,
    t.metadata,
    t.occurred_at,
    t.created_at,

    m.id AS matter_id,
    m.reference_number AS matter_reference,
    m.title AS matter_title,

    c.id AS client_id,
    TRIM(
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '')
    ) AS client_name,

    u.id AS user_id,
    TRIM(
        COALESCE(u.first_name, '') || ' ' ||
        COALESCE(u.last_name, '')
    ) AS user_name

FROM timeline_entries t

INNER JOIN matters m
    ON m.id = t.matter_id

LEFT JOIN clients c
    ON c.id = t.client_id

LEFT JOIN users u
    ON u.id = t.user_id;
