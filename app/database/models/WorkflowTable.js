export default class WorkflowTable {
    static tableName = "workflows";

    static primaryKey = "id";

    static columns = [
        "id",
        "matter_id",
        "type",
        "status",
        "current_step",
        "assigned_to",
        "started_at",
        "completed_at",
        "created_at",
        "updated_at"
    ];
}
