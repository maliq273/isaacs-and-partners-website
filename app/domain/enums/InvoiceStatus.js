// Invoice lifecycle values are stored by Supabase as uppercase database values.
export const InvoiceStatus = Object.freeze({
    DRAFT: "DRAFT",
    ISSUED: "ISSUED",
    SENT: "SENT",
    PARTIALLY_PAID: "PARTIALLY_PAID",
    PART_PAID: "PART_PAID",
    PAID: "PAID",
    OVERDUE: "OVERDUE",
    VOID: "VOID",
    CANCELLED: "CANCELLED"
});

export default InvoiceStatus;
