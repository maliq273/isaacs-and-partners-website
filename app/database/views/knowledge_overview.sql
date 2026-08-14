CREATE VIEW IF NOT EXISTS vw_knowledge_overview AS
SELECT
    k.id,
    k.domain,
    k.category,
    k.title,
    k.source_type,
    k.source_name,
    k.source_url,
    k.citation,
    k.source_date,
    k.effective_date,
    k.version,
    k.jurisdiction,
    k.status,
    k.authority_level,
    k.tags,
    k.created_at,
    k.updated_at
FROM knowledge k
WHERE k.status = 'active';
