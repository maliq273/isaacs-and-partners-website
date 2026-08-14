import TableDefinition from "./TableDefinition.js";

export default new TableDefinition({
    name: "companies",
    primaryKey: "id",
    columns: [
        "id",
        "registration_number",
        "tax_number",
        "name",
        "trading_name",
        "vat_registered",
        "vat_number",
        "email",
        "telephone",
        "physical_address",
        "postal_address",
        "bank_name",
        "account_holder",
        "account_number",
        "branch_code",
        "account_type",
        "payment_terms",
        "banking_reference_format",
        "legal_representative",
        "legal_representative_title",
        "status",
        "created_at",
        "updated_at"
    ],
    indexes: [
        "idx_companies_registration_number",
        "idx_companies_tax_number",
        "idx_companies_status",
        "idx_companies_created_at"
    ]
});
