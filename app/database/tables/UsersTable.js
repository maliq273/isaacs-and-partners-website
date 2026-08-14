import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "users",
    primaryKey: "id",
    columns: [
        "id",
        "username",
        "email",
        "password_hash",
        "first_name",
        "last_name",
        "role",
        "department",
        "status",
        "last_login",
        "created_at",
        "updated_at"
    ],
    indexes: [
        "idx_users_email",
        "idx_users_username",
        "idx_users_role",
        "idx_users_status",
        "idx_users_last_login"
    ]
});
