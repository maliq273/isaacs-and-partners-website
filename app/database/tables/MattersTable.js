import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "matters",
    primaryKey: "id",
    columns: [
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
    ],
    indexes: [
        "idx_matters_client_id",
        "idx_matters_status",
        "idx_matters_stage",
        "idx_matters_type",
        "idx_matters_priority",
        "idx_matters_assigned_to",
        "idx_matters_department",
        "idx_matters_created_at",
        "idx_matters_updated_at",
        "idx_matters_reference_number"
    ]
});
