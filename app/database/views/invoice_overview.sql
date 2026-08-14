CREATE VIEW IF NOT EXISTS vw_invoice_overview AS
SELECT
    i.id,
    i.invoice_number,
    i.issue_date,
    i.due_date,
    i.status,
    i.currency,
    i.subtotal,
    i.discount,
    i.tax,
    i.total,
    i.amount_paid,
    i.balance_due,
    i.notes,
    i.created_at,
    i.updated_at,

    c.id AS client_id,
    TRIM(
        COALESCE(c.first_name, '') || ' ' ||
        COALESCE(c.last_name, '')
    ) AS client_name,
    c.email AS client_email,
    c.phone AS client_phone,

    m.id AS matter_id,
    m.reference_number AS matter_reference,
    m.title AS matter_title,

    CASE
        WHEN i.status IN (
            'paid',
            'cancelled',
            'void'
        )
        THEN 0

        WHEN i.due_date IS NOT NULL
             AND date(i.due_date) < date('now')
        THEN 1

        ELSE 0
    END AS is_overdue

FROM invoices i

INNER JOIN clients c
    ON c.id = i.client_id

LEFT JOIN matters m
    ON m.id = i.matter_id;
