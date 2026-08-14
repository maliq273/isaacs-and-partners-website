CREATE TRIGGER IF NOT EXISTS trg_invoice_payment_insert
AFTER INSERT ON payments
FOR EACH ROW
WHEN NEW.invoice_id IS NOT NULL
     AND NEW.status = 'completed'
BEGIN
    UPDATE invoices
    SET
        amount_paid = (
            SELECT COALESCE(
                SUM(amount),
                0
            )
            FROM payments
            WHERE invoice_id = NEW.invoice_id
              AND status = 'completed'
        ),
        balance_due = MAX(
            total - (
                SELECT COALESCE(
                    SUM(amount),
                    0
                )
                FROM payments
                WHERE invoice_id = NEW.invoice_id
                  AND status = 'completed'
            ),
            0
        ),
        status = CASE
            WHEN (
                SELECT COALESCE(
                    SUM(amount),
                    0
                )
                FROM payments
                WHERE invoice_id = NEW.invoice_id
                  AND status = 'completed'
            ) >= total
                THEN 'paid'
            WHEN (
                SELECT COALESCE(
                    SUM(amount),
                    0
                )
                FROM payments
                WHERE invoice_id = NEW.invoice_id
                  AND status = 'completed'
            ) > 0
                THEN 'partially_paid'
            ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_invoice_payment_update
AFTER UPDATE OF amount, status, invoice_id ON payments
FOR EACH ROW
BEGIN
    UPDATE invoices
    SET
        amount_paid = (
            SELECT COALESCE(
                SUM(amount),
                0
            )
            FROM payments
            WHERE invoice_id = invoices.id
              AND status = 'completed'
        ),
        balance_due = MAX(
            total - (
                SELECT COALESCE(
                    SUM(amount),
                    0
                )
                FROM payments
                WHERE invoice_id = invoices.id
                  AND status = 'completed'
            ),
            0
        ),
        status = CASE
            WHEN (
                SELECT COALESCE(
                    SUM(amount),
                    0
                )
                FROM payments
                WHERE invoice_id = invoices.id
                  AND status = 'completed'
            ) >= total
                THEN 'paid'
            WHEN (
                SELECT COALESCE(
                    SUM(amount),
                    0
                )
                FROM payments
                WHERE invoice_id = invoices.id
                  AND status = 'completed'
            ) > 0
                THEN 'partially_paid'
            ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;

    UPDATE invoices
    SET
        amount_paid = (
            SELECT COALESCE(
                SUM(amount),
                0
            )
            FROM payments
            WHERE invoice_id = invoices.id
              AND status = 'completed'
        ),
        balance_due = MAX(
            total - (
                SELECT COALESCE(
                    SUM(amount),
                    0
                )
                FROM payments
                WHERE invoice_id = invoices.id
                  AND status = 'completed'
            ),
            0
        )
    WHERE id = OLD.invoice_id
      AND OLD.invoice_id IS NOT NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_invoice_payment_delete
AFTER DELETE ON payments
FOR EACH ROW
WHEN OLD.invoice_id IS NOT NULL
BEGIN
    UPDATE invoices
    SET
        amount_paid = (
            SELECT COALESCE(
                SUM(amount),
                0
            )
            FROM payments
            WHERE invoice_id = OLD.invoice_id
              AND status = 'completed'
        ),
        balance_due = MAX(
            total - (
                SELECT COALESCE(
                    SUM(amount),
                    0
                )
                FROM payments
                WHERE invoice_id = OLD.invoice_id
                  AND status = 'completed'
            ),
            0
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.invoice_id;
END;
