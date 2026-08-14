/**
 * Controlled reference values used by the application.
 *
 * These values correspond with the existing shared constants/domain
 * structure and are intentionally stored as application metadata
 * rather than duplicated into multiple business tables.
 */

export const REFERENCE_DATA = Object.freeze({
    departments: [
        "immigration",
        "legal",
        "hr",
        "labour",
        "business",
        "compliance",
        "mediation",
        "notary",
        "management"
    ],

    matterStatuses: [
        "draft",
        "open",
        "pending",
        "in_progress",
        "awaiting_client",
        "awaiting_authority",
        "on_hold",
        "completed",
        "closed",
        "cancelled"
    ],

    matterPriorities: [
        "low",
        "normal",
        "high",
        "urgent",
        "critical"
    ],

    documentStatuses: [
        "required",
        "pending",
        "uploaded",
        "processing",
        "verified",
        "rejected",
        "expired",
        "superseded"
    ],

    appointmentStatuses: [
        "scheduled",
        "confirmed",
        "rescheduled",
        "completed",
        "cancelled",
        "no_show"
    ],

    invoiceStatuses: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled"
    ],

    paymentStatuses: [
        "pending",
        "completed",
        "failed",
        "refunded",
        "cancelled"
    ],

    workflowStatuses: [
        "pending",
        "active",
        "paused",
        "completed",
        "failed",
        "cancelled"
    ]
});

export default REFERENCE_DATA;
