/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Notifications
 * ============================================================
 */

export const NotificationType =
    Object.freeze({

        INFO: "INFO",

        SUCCESS: "SUCCESS",

        WARNING: "WARNING",

        ERROR: "ERROR",

        MATTER: "MATTER",

        DOCUMENT: "DOCUMENT",

        APPOINTMENT: "APPOINTMENT",

        PAYMENT: "PAYMENT",

        WORKFLOW: "WORKFLOW",

        SYSTEM: "SYSTEM"

    });


export function createNotification(
    data = {}
) {

    return {

        id:
            data.id ??
            `notification_${Date.now()}`,

        type:
            data.type ??
            NotificationType.INFO,

        title:
            data.title ??
            "",

        message:
            data.message ??
            "",

        matterId:
            data.matterId ??
            null,

        clientId:
            data.clientId ??
            null,

        userId:
            data.userId ??
            null,

        read:
            data.read ??
            false,

        createdAt:
            data.createdAt ??
            new Date().toISOString(),

        metadata:
            data.metadata ??
            {}

    };

}


export function markNotificationRead(
    notification
) {

    return {

        ...notification,

        read: true,

        readAt:
            new Date().toISOString()

    };

}


export function createMatterNotification(
    matter,
    message,
    options = {}
) {

    return createNotification({

        ...options,

        type:
            NotificationType.MATTER,

        title:
            options.title ??
            `Matter Update: ${matter?.referenceNumber ?? ""}`,

        message,

        matterId:
            matter?.id ??
            options.matterId ??
            null

    });

}


export function createDocumentNotification(
    document,
    message,
    options = {}
) {

    return createNotification({

        ...options,

        type:
            NotificationType.DOCUMENT,

        title:
            options.title ??
            "Document Update",

        message,

        matterId:
            document?.matterId ??
            options.matterId ??
            null

    });

}


export function createAppointmentNotification(
    appointment,
    message,
    options = {}
) {

    return createNotification({

        ...options,

        type:
            NotificationType.APPOINTMENT,

        title:
            options.title ??
            "Appointment Update",

        message,

        matterId:
            appointment?.matterId ??
            options.matterId ??
            null

    });

}


// ============================================================
// FUTURE INSERT
//
// WhatsApp notifications
// Email notifications
// SMS notifications
// Portal notifications
// Push notifications
// Automated reminders
// Monday applicant updates
//
// ============================================================
