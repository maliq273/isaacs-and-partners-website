CREATE VIEW IF NOT EXISTS vw_workflow_overview AS
SELECT
    w.id,
    w.type,
    w.status,
    w.current_step,
    w.started_at,
    w.completed_at,
    w.created_at,
    w.updated_at,

    m.id AS matter_id,
    m.reference_number AS matter_reference,
    m.title AS matter_title,
    m.type AS matter_type,
    m.department AS matter_department,

    c.id AS client_id,
    TRIM(
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '')
    ) AS client_name,

    u.id AS assigned_user_id,
    TRIM(
        COALESCE(u.first_name, '') || ' ' ||
        COALESCE(u.last_name, '')
    ) AS assigned_user_name

FROM workflows w

INNER JOIN matters m
    ON m.id = w.matter_id

INNER JOIN clients c
    ON c.id = m.client_id

LEFT JOIN users u
    ON u.id = w.assigned_to;
