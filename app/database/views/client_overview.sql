CREATE VIEW IF NOT EXISTS vw_client_overview AS
SELECT
    c.id,
    c.matter_number,
    c.first_name,
    c.last_name,
    TRIM(
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '')
    ) AS full_name,
    c.email,
    c.phone,
    c.passport_number,
    c.nationality,
    c.status,
    c.created_at,
    c.updated_at,

    COUNT(DISTINCT m.id) AS matter_count,
    COUNT(DISTINCT d.id) AS document_count,
    COUNT(DISTINCT i.id) AS invoice_count,

    COALESCE(
        SUM(
            CASE
                WHEN i.status NOT IN (
                    'paid',
                    'cancelled',
                    'void'
                )
                THEN i.balance_due
                ELSE 0
            END
        ),
        0
    ) AS outstanding_balance

FROM clients c

LEFT JOIN matters m
    ON m.client_id = c.id

LEFT JOIN documents d
    ON d.client_id = c.id

LEFT JOIN invoices i
    ON i.client_id = c.id

GROUP BY c.id;
