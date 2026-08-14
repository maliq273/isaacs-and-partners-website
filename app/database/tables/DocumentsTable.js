import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "documents",
    primaryKey: "id",
    columns: [
        "id",
        "client_id",
        "matter_id",
        "document_type",
        "name",
        "file_name",
        "file_path",
        "mime_type",
        "file_size",
        "file_hash",
        "status",
        "expiry_date",
        "verified_at",
        "verified_by",
        "created_at",
        "updated_at"
    ],
    indexes: [
        "idx_documents_matter_id",
        "idx_documents_client_id",
        "idx_documents_document_type",
        "idx_documents_status",
        "idx_documents_uploaded_at",
        "idx_documents_expiry_date",
        "idx_documents_verified_at",
        "idx_documents_hash"
    ]
});
