CREATE INDEX IF NOT EXISTS idx_payments_client_id
ON payments(client_id);

CREATE INDEX IF NOT EXISTS idx_payments_matter_id
ON payments(matter_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
ON payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments(status);

CREATE INDEX IF NOT EXISTS idx_payments_payment_date
ON payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_payments_reference
ON payments(reference);
