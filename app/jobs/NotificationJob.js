/**
 * NotificationJob
 * ------------------------------------------------------------
 * Processes queued notifications.
 *
 * Supports integration with:
 * - NotificationManager
 * - NotificationService
 * - WhatsApp/SMS/email adapters
 */

export class NotificationJob {
    constructor({
        notificationManager = null,
        notificationService = null,
        logger = console
    } = {}) {
        this.notificationManager =
            notificationManager;

        this.notificationService =
            notificationService;

        this.logger = logger;
        this.name = "NotificationJob";
    }

    async execute(notification = {}) {
        const startedAt = Date.now();

        try {
            const result =
                await this.send(
                    notification
                );

            return {
                success: true,
                job: this.name,
                startedAt,
                completedAt: Date.now(),
                duration:
                    Date.now() - startedAt,
                result
            };
        } catch (error) {
            this.logger.error(
                `${this.name} failed`,
                error
            );

            return {
                success: false,
                job: this.name,
                startedAt,
                completedAt: Date.now(),
                error: {
                    message:
                        error?.message ||
                        "Notification failed"
                }
            };
        }
    }

    async send(notification) {
        if (
            this.notificationManager &&
            typeof this.notificationManager.send ===
                "function"
        ) {
            return this.notificationManager.send(
                notification
            );
        }

        if (
            this.notificationService &&
            typeof this.notificationService.send ===
                "function"
        ) {
            return this.notificationService.send(
                notification
            );
        }

        throw new Error(
            "NotificationJob requires NotificationManager or NotificationService"
        );
    }
}

export default NotificationJob;
