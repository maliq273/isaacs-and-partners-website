CREATE VIEW IF NOT EXISTS vw_task_overview AS
SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.completed_at,
    t.created_at,
    t.updated_at,

    m.id AS matter_id,
    m.reference_number AS matter_reference,
    m.title AS matter_title,
    m.status AS matter_status,

    c.id AS client_id,
    TRIM(
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '')
    ) AS client_name,

    u.id AS assigned_user_id,
    TRIM(
        COALESCE(u.first_name, '') || ' ' ||
        COALESCE(u.last_name, '')
    ) AS assigned_user_name,

    CASE
        WHEN t.status IN (
            'completed',
            'complete',
            'done'
        )
        THEN 0

        WHEN t.due_date IS NOT NULL
             AND date(t.due_date) < date('now')
        THEN 1

        ELSE 0
    END AS is_overdue

FROM tasks t

INNER JOIN matters m
    ON m.id = t.matter_id

LEFT JOIN clients c
    ON c.id = m.client_id

LEFT JOIN users u
    ON u.id = t.assigned_to;
