CREATE INDEX IF NOT EXISTS idx_documents_matter_id
ON documents(matter_id);

CREATE INDEX IF NOT EXISTS idx_documents_client_id
ON documents(client_id);

CREATE INDEX IF NOT EXISTS idx_documents_document_type
ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_documents_status
ON documents(status);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at
ON documents(uploaded_at);

CREATE INDEX IF NOT EXISTS idx_documents_expiry_date
ON documents(expiry_date);

CREATE INDEX IF NOT EXISTS idx_documents_verified_at
ON documents(verified_at);

CREATE INDEX IF NOT EXISTS idx_documents_hash
ON documents(file_hash);
