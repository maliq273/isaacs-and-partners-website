export default class MatterTable {
    static tableName = "matters";

    static primaryKey = "id";

    static columns = [
        "id",
        "client_id",
        "reference_number",
        "title",
        "type",
        "department",
        "stage",
        "status",
        "priority",
        "assigned_to",
        "source",
        "outcome",
        "opened_at",
        "closed_at",
        "created_at",
        "updated_at"
    ];
}
