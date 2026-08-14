CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    matter_id TEXT,
    invoice_id TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    payment_method TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (matter_id)
        REFERENCES matters(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CHECK (amount > 0)
);
