CREATE VIEW IF NOT EXISTS vw_payment_overview AS
SELECT
    p.id,
    p.amount,
    p.currency,
    p.payment_method,
    p.payment_date,
    p.reference,
    p.status,
    p.notes,
    p.created_at,
    p.updated_at,

    p.client_id,

    TRIM(
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '')
    ) AS client_name,

    p.matter_id,
    m.reference_number AS matter_reference,

    p.invoice_id,
    i.invoice_number

FROM payments p

INNER JOIN clients c
    ON c.id = p.client_id

LEFT JOIN matters m
    ON m.id = p.matter_id

LEFT JOIN invoices i
    ON i.id = p.invoice_id;
