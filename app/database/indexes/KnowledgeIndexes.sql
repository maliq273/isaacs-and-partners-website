CREATE INDEX IF NOT EXISTS idx_knowledge_domain
ON knowledge(domain);

CREATE INDEX IF NOT EXISTS idx_knowledge_category
ON knowledge(category);

CREATE INDEX IF NOT EXISTS idx_knowledge_source_type
ON knowledge(source_type);

CREATE INDEX IF NOT EXISTS idx_knowledge_source_date
ON knowledge(source_date);

CREATE INDEX IF NOT EXISTS idx_knowledge_version
ON knowledge(version);

CREATE INDEX IF NOT EXISTS idx_knowledge_status
ON knowledge(status);
