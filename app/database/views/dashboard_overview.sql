CREATE VIEW IF NOT EXISTS vw_dashboard_overview AS
SELECT
    (SELECT COUNT(*) FROM clients
     WHERE status = 'active') AS active_clients,

    (SELECT COUNT(*) FROM matters
     WHERE status NOT IN ('closed', 'completed', 'resolved')) AS open_matters,

    (SELECT COUNT(*) FROM matters
     WHERE status IN ('closed', 'completed', 'resolved')) AS closed_matters,

    (SELECT COUNT(*) FROM documents
     WHERE status NOT IN ('verified', 'archived')) AS outstanding_documents,

    (SELECT COUNT(*) FROM tasks
     WHERE status NOT IN ('completed', 'complete', 'done')) AS outstanding_tasks,

    (SELECT COUNT(*) FROM workflows
     WHERE status IN ('active', 'in_progress', 'running')) AS active_workflows,

    (SELECT COALESCE(SUM(balance_due), 0)
     FROM invoices
     WHERE status NOT IN ('paid', 'cancelled', 'void')) AS outstanding_amount,

    (SELECT COALESCE(SUM(amount), 0)
     FROM payments
     WHERE status = 'completed') AS total_payments;
