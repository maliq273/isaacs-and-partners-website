CREATE INDEX IF NOT EXISTS idx_clients_status
ON clients(status);

CREATE INDEX IF NOT EXISTS idx_clients_created_at
ON clients(created_at);

CREATE INDEX IF NOT EXISTS idx_clients_updated_at
ON clients(updated_at);

CREATE INDEX IF NOT EXISTS idx_clients_email
ON clients(email);

CREATE INDEX IF NOT EXISTS idx_clients_phone
ON clients(phone);

CREATE INDEX IF NOT EXISTS idx_clients_passport_number
ON clients(passport_number);

CREATE INDEX IF NOT EXISTS idx_clients_matter_number
ON clients(matter_number);
