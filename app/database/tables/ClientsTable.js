import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "clients",
    primaryKey: "id",
    columns: [
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
    ],
    indexes: [
        "idx_clients_status",
        "idx_clients_created_at",
        "idx_clients_updated_at",
        "idx_clients_email",
        "idx_clients_phone",
        "idx_clients_passport_number",
        "idx_clients_matter_number"
    ]
});
