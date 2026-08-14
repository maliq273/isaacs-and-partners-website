CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL,
    matter_id TEXT,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'issued',
    currency TEXT NOT NULL DEFAULT 'ZAR',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    balance_due NUMERIC NOT NULL DEFAULT 0,
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

    CHECK (subtotal >= 0),
    CHECK (discount >= 0),
    CHECK (tax >= 0),
    CHECK (total >= 0),
    CHECK (amount_paid >= 0),
    CHECK (balance_due >= 0)
);
