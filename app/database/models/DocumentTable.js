export default class DocumentTable {
    static tableName = "documents";

    static primaryKey = "id";

    static columns = [
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
    ];
}
