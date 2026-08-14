import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "tasks",
    primaryKey: "id",
    columns: [
        "id",
        "matter_id",
        "assigned_to",
        "title",
        "description",
        "status",
        "priority",
        "due_date",
        "completed_at",
        "created_at",
        "updated_at"
    ],
    indexes: [
        "idx_tasks_matter_id",
        "idx_tasks_assigned_to",
        "idx_tasks_status",
        "idx_tasks_priority",
        "idx_tasks_due_date"
    ]
});
