export default class ClientTable {
    static tableName = "clients";

    static primaryKey = "id";

    static columns = [
        "id",
        "matter_number",
        "first_name",
        "last_name",
        "email",
        "phone",
        "passport_number",
        "nationality",
        "date_of_birth",
        "status",
        "notes",
        "created_at",
        "updated_at"
    ];
}
