import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "workflows",
    primaryKey: "id",
    columns: [
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
    ],
    indexes: [
        "idx_workflows_matter_id",
        "idx_workflows_status",
        "idx_workflows_type",
        "idx_workflows_current_step",
        "idx_workflows_assigned_to",
        "idx_workflows_created_at"
    ]
});
