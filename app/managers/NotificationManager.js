/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Notification Manager
 * ============================================================
 */

export default class NotificationManager {

    constructor({
        notificationService = null,
        eventBus = null,
        logger = null
    } = {}) {

        this.notificationService =
            notificationService;

        this.eventBus = eventBus;
        this.logger = logger;

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // WhatsApp provider
        // Email provider
        // SMS provider
        // Push notifications
        // Notification templates
        // ====================================================
    }


    async send(
        notification
    ) {

        if (
            !this.notificationService ||
            typeof this.notificationService.send !==
            "function"
        ) {

            throw new Error(
                "Notification service is not configured."
            );

        }

        return this.notificationService.send(
            notification
        );

    }


    async email(
        data
    ) {

        if (
            this.notificationService &&
            typeof this.notificationService.email ===
            "function"
        ) {

            return this.notificationService.email(
                data
            );

        }

        return this.send({
            ...data,
            channel: "email"
        });

    }


    async whatsapp(
        data
    ) {

        if (
            this.notificationService &&
            typeof this.notificationService.whatsapp ===
            "function"
        ) {

            return this.notificationService.whatsapp(
                data
            );

        }

        return this.send({
            ...data,
            channel: "whatsapp"
        });

    }


    async sms(
        data
    ) {

        if (
            this.notificationService &&
            typeof this.notificationService.sms ===
            "function"
        ) {

            return this.notificationService.sms(
                data
            );

        }

        return this.send({
            ...data,
            channel: "sms"
        });

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Applicant outstanding-document alerts
    // Monday WhatsApp updates
    // Appointment reminders
    // Matter status alerts
    // Bundle-ready notifications
    // Staff notifications
    // ========================================================

}
