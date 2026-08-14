CREATE VIEW IF NOT EXISTS vw_matter_overview AS
SELECT
    m.id,
    m.reference_number,
    m.title,
    m.type,
    m.department,
    m.stage,
    m.status,
    m.priority,
    m.assigned_to,
    m.source,
    m.outcome,
    m.opened_at,
    m.closed_at,
    m.created_at,
    m.updated_at,

    c.id AS client_id,
    c.matter_number AS client_matter_number,
    TRIM(
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '')
    ) AS client_name,
    c.email AS client_email,
    c.phone AS client_phone,
    c.passport_number,

    COUNT(DISTINCT d.id) AS document_count,

    COUNT(
        DISTINCT CASE
            WHEN d.status NOT IN (
                'verified',
                'archived'
            )
            THEN d.id
        END
    ) AS outstanding_document_count,

    COUNT(DISTINCT t.id) AS task_count,

    COUNT(
        DISTINCT CASE
            WHEN t.status NOT IN (
                'completed',
                'complete',
                'done'
            )
            THEN t.id
        END
    ) AS outstanding_task_count,

    COUNT(DISTINCT w.id) AS workflow_count,

    COUNT(
        DISTINCT CASE
            WHEN w.status IN (
                'active',
                'in_progress',
                'running'
            )
            THEN w.id
        END
    ) AS active_workflow_count

FROM matters m

INNER JOIN clients c
    ON c.id = m.client_id

LEFT JOIN documents d
    ON d.matter_id = m.id

LEFT JOIN tasks t
    ON t.matter_id = m.id

LEFT JOIN workflows w
    ON w.matter_id = m.id

GROUP BY m.id;
