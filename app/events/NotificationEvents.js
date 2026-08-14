/**
 * NotificationEvents
 * ------------------------------------------------------------
 * Notification lifecycle events.
 */

export const NotificationEvents = Object.freeze({
    CREATED:
        "notification.created",

    QUEUED:
        "notification.queued",

    SENT:
        "notification.sent",

    FAILED:
        "notification.failed",

    READ:
        "notification.read",

    DISMISSED:
        "notification.dismissed",

    REMINDER_CREATED:
        "notification.reminder.created",

    REMINDER_SENT:
        "notification.reminder.sent",

    APPOINTMENT_REMINDER:
        "notification.appointment.reminder",

    DOCUMENT_OUTSTANDING:
        "notification.document.outstanding",

    MATTER_STATUS_CHANGED:
        "notification.matter.status.changed",

    PAYMENT_DUE:
        "notification.payment.due"
});

export default NotificationEvents;
