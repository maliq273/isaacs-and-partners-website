CREATE VIEW IF NOT EXISTS vw_matter_financial_summary AS
SELECT
    m.id AS matter_id,
    m.reference_number,
    m.title,

    COALESCE(
        SUM(DISTINCT i.total),
        0
    ) AS invoiced_total,

    COALESCE(
        SUM(DISTINCT i.amount_paid),
        0
    ) AS paid_total,

    COALESCE(
        SUM(DISTINCT i.balance_due),
        0
    ) AS outstanding_total,

    COALESCE(
        (
            SELECT SUM(p.amount)
            FROM payments p
            WHERE p.matter_id = m.id
              AND p.status = 'completed'
        ),
        0
    ) AS payment_total

FROM matters m

LEFT JOIN invoices i
    ON i.matter_id = m.id

GROUP BY m.id;
