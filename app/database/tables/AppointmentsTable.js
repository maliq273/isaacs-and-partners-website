import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "appointments",
    primaryKey: "id",
    columns: [
        "id",
        "client_id",
        "matter_id",
        "user_id",
        "appointment_type",
        "appointment_date",
        "start_time",
        "end_time",
        "status",
        "location",
        "notes",
        "created_at",
        "updated_at"
    ],
    indexes: [
        "idx_appointments_client_id",
        "idx_appointments_matter_id",
        "idx_appointments_user_id",
        "idx_appointments_status",
        "idx_appointments_start_time",
        "idx_appointments_end_time",
        "idx_appointments_date"
    ]
});
