CREATE INDEX IF NOT EXISTS idx_companies_registration_number
ON companies(registration_number);

CREATE INDEX IF NOT EXISTS idx_companies_tax_number
ON companies(tax_number);

CREATE INDEX IF NOT EXISTS idx_companies_status
ON companies(status);

CREATE INDEX IF NOT EXISTS idx_companies_created_at
ON companies(created_at);
