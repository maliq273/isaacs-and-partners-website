/**
 * PaymentStatus
 * ------------------------------------------------------------
 * Canonical payment lifecycle values.
 *
 * Used by Payment, Invoice and Retainer-related workflows.
 */

export const PaymentStatus = Object.freeze({
    PENDING: "pending",
    PROCESSING: "processing",
    AUTHORIZED: "authorized",
    PARTIALLY_PAID:
        "partially_paid",
    PAID: "paid",
    FAILED: "failed",
    CANCELLED: "cancelled",
    REFUNDED: "refunded",
    REVERSED: "reversed"
});

export default PaymentStatus;
