CREATE TABLE IF NOT EXISTS knowledge (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    category TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT,
    source_name TEXT,
    source_url TEXT,
    citation TEXT,
    source_date TEXT,
    effective_date TEXT,
    version TEXT,
    jurisdiction TEXT DEFAULT 'South Africa',
    status TEXT NOT NULL DEFAULT 'active',
    authority_level TEXT,
    tags TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_domain
    ON knowledge(domain);

CREATE INDEX IF NOT EXISTS idx_knowledge_category
    ON knowledge(category);

CREATE INDEX IF NOT EXISTS idx_knowledge_source_type
    ON knowledge(source_type);

CREATE INDEX IF NOT EXISTS idx_knowledge_source_date
    ON knowledge(source_date);

CREATE INDEX IF NOT EXISTS idx_knowledge_effective_date
    ON knowledge(effective_date);

CREATE INDEX IF NOT EXISTS idx_knowledge_version
    ON knowledge(version);

CREATE INDEX IF NOT EXISTS idx_knowledge_status
    ON knowledge(status);

CREATE INDEX IF NOT EXISTS idx_knowledge_authority_level
    ON knowledge(authority_level);
