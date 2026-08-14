CREATE VIEW IF NOT EXISTS vw_document_overview AS
SELECT
    d.id,
    d.document_type,
    d.name,
    d.file_name,
    d.file_path,
    d.mime_type,
    d.file_size,
    d.file_hash,
    d.status,
    d.expiry_date,
    d.verified_at,
    d.created_at,
    d.updated_at,

    c.id AS client_id,
    TRIM(
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '')
    ) AS client_name,
    c.passport_number,

    m.id AS matter_id,
    m.reference_number AS matter_reference,
    m.title AS matter_title,

    CASE
        WHEN d.expiry_date IS NULL THEN 0
        WHEN date(d.expiry_date) < date('now') THEN 1
        ELSE 0
    END AS is_expired,

    CASE
        WHEN d.expiry_date IS NULL THEN 0
        WHEN date(d.expiry_date)
             BETWEEN date('now')
             AND date('now', '+30 days')
        THEN 1
        ELSE 0
    END AS expires_within_30_days

FROM documents d

LEFT JOIN clients c
    ON c.id = d.client_id

LEFT JOIN matters m
    ON m.id = d.matter_id;
