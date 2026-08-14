/**
 * DomainEvents
 * ------------------------------------------------------------
 * Core domain events shared by the application.
 */

export const DomainEvents = Object.freeze({
    CLIENT_CREATED:
        "domain.client.created",

    CLIENT_UPDATED:
        "domain.client.updated",

    CLIENT_ARCHIVED:
        "domain.client.archived",

    MATTER_CREATED:
        "domain.matter.created",

    MATTER_UPDATED:
        "domain.matter.updated",

    MATTER_STATUS_CHANGED:
        "domain.matter.status.changed",

    MATTER_CLOSED:
        "domain.matter.closed",

    DOCUMENT_CREATED:
        "domain.document.created",

    DOCUMENT_UPDATED:
        "domain.document.updated",

    DOCUMENT_VERIFIED:
        "domain.document.verified",

    DOCUMENT_REJECTED:
        "domain.document.rejected",

    APPOINTMENT_CREATED:
        "domain.appointment.created",

    APPOINTMENT_UPDATED:
        "domain.appointment.updated",

    APPOINTMENT_CANCELLED:
        "domain.appointment.cancelled",

    TASK_CREATED:
        "domain.task.created",

    TASK_COMPLETED:
        "domain.task.completed",

    COMMUNICATION_CREATED:
        "domain.communication.created",

    NOTE_CREATED:
        "domain.note.created",

    PAYMENT_RECEIVED:
        "domain.payment.received",

    INVOICE_CREATED:
        "domain.invoice.created",

    INVOICE_PAID:
        "domain.invoice.paid"
});

export default DomainEvents;
