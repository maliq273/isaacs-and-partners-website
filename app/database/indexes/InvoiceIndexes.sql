CREATE INDEX IF NOT EXISTS idx_invoices_client_id
ON invoices(client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_matter_id
ON invoices(matter_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number
ON invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoices_issue_date
ON invoices(issue_date);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date
ON invoices(due_date);
