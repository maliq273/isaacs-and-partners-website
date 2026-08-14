export default class AppointmentTable {
    static tableName = "appointments";

    static primaryKey = "id";

    static columns = [
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
    ];
}
