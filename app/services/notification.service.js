/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * notification.service.js
 * ============================================================
 *
 * LOCATION
 * app/services/notification.service.js
 *
 * PURPOSE
 * Legacy compatibility adapter.
 *
 * MAIN SERVICE
 * NotificationService.js
 * ============================================================
 */

import NotificationService
    from "./NotificationService.js";

const notificationService =
    new NotificationService();

export async function sendEmail(
    data
) {

    return notificationService.sendEmail(
        data
    );

}

export async function sendWhatsApp(
    data
) {

    return notificationService.sendWhatsApp(
        data
    );

}

export async function sendSMS(
    data
) {

    return notificationService.sendSMS(
        data
    );

}

export async function sendToClient(
    data
) {

    return notificationService.sendToClient(
        data
    );

}


/*
 * ============================================================
 * FUTURE INSERT
 *
 * WhatsApp
 * Email
 * SMS
 * Push
 * Appointment reminders
 * Matter notifications
 * Applicant updates
 * Bundle-ready notifications
 * ============================================================
 */

export default notificationService;
