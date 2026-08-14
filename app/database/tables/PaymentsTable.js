import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "payments",
    primaryKey: "id",
    columns: [
        "id",
        "client_id",
        "matter_id",
        "invoice_id",
        "amount",
        "currency",
        "payment_method",
        "payment_date",
        "reference",
        "status",
        "notes",
        "created_at",
        "updated_at"
    ],
    indexes: [
        "idx_payments_client_id",
        "idx_payments_matter_id",
        "idx_payments_invoice_id",
        "idx_payments_status",
        "idx_payments_payment_date",
        "idx_payments_reference"
    ]
});
