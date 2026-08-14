import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "knowledge",
    primaryKey: "id",
    columns: [
        "id",
        "domain",
        "category",
        "title",
        "content",
        "source_type",
        "source_name",
        "source_url",
        "citation",
        "source_date",
        "effective_date",
        "version",
        "jurisdiction",
        "status",
        "authority_level",
        "tags",
        "metadata",
        "created_at",
        "updated_at"
    ],
    indexes: [
        "idx_knowledge_domain",
        "idx_knowledge_category",
        "idx_knowledge_source_type",
        "idx_knowledge_source_date",
        "idx_knowledge_version",
        "idx_knowledge_status"
    ]
});
