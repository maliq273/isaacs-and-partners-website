/**
 * NotificationEngine
 * ------------------------------------------------------------
 * Central notification orchestration.
 */

export class NotificationEngine {
    constructor({
        notificationService = null,
        notificationManager = null,
        eventDispatcher = null,
        logger = console
    } = {}) {
        this.notificationService =
            notificationService;
        this.notificationManager =
            notificationManager;
        this.eventDispatcher =
            eventDispatcher;
        this.logger = logger;
    }

    async send(
        notification,
        options = {}
    ) {
        if (
            this.notificationService
                ?.send
        ) {
            return this.notificationService.send(
                notification,
                options
            );
        }

        if (
            this.notificationManager
                ?.send
        ) {
            return this.notificationManager.send(
                notification,
                options
            );
        }

        throw new Error(
            "Notification service or manager is required"
        );
    }

    async sendBookingConfirmation(
        booking,
        options = {}
    ) {
        return this.send(
            {
                type:
                    "booking_confirmation",
                booking
            },
            options
        );
    }

    async sendOutstandingDocuments(
        matter,
        documents,
        options = {}
    ) {
        return this.send(
            {
                type:
                    "outstanding_documents",
                matter,
                documents
            },
            options
        );
    }

    async sendMatterUpdate(
        matter,
        options = {}
    ) {
        return this.send(
            {
                type:
                    "matter_update",
                matter
            },
            options
        );
    }

    async sendReminder(
        reminder,
        options = {}
    ) {
        return this.send(
            {
                type:
                    "reminder",
                reminder
            },
            options
        );
    }

    async emit(
        event,
        payload
    ) {
        if (
            this.eventDispatcher?.emit
        ) {
            return this.eventDispatcher.emit(
                event,
                payload
            );
        }

        return null;
    }
}

export default NotificationEngine;
