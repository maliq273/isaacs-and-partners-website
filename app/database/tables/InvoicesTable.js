import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "invoices",
    primaryKey: "id",
    columns: [
        "id",
        "invoice_number",
        "client_id",
        "matter_id",
        "issue_date",
        "due_date",
        "status",
        "currency",
        "subtotal",
        "discount",
        "tax",
        "total",
        "amount_paid",
        "balance_due",
        "notes",
        "created_at",
        "updated_at"
    ],
    indexes: [
        "idx_invoices_client_id",
        "idx_invoices_matter_id",
        "idx_invoices_status",
        "idx_invoices_invoice_number",
        "idx_invoices_issue_date",
        "idx_invoices_due_date"
    ]
});
