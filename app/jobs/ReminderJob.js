/**
 * ReminderJob
 * ------------------------------------------------------------
 * Processes scheduled reminders.
 *
 * Typical use:
 * - appointment reminders
 * - document outstanding reminders
 * - payment reminders
 * - matter follow-ups
 * - client communication reminders
 */

export class ReminderJob {
    constructor({
        reminderManager = null,
        notificationService = null,
        logger = console
    } = {}) {
        this.reminderManager =
            reminderManager;

        this.notificationService =
            notificationService;

        this.logger = logger;
        this.name = "ReminderJob";
    }

    async execute(options = {}) {
        const startedAt = Date.now();

        try {
            const result =
                await this.processReminders(
                    options
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
                        "Reminder processing failed"
                }
            };
        }
    }

    async processReminders(options) {
        if (
            this.reminderManager &&
            typeof this.reminderManager.process ===
                "function"
        ) {
            return this.reminderManager.process(
                options
            );
        }

        if (
            this.notificationService &&
            typeof this.notificationService.processReminders ===
                "function"
        ) {
            return this.notificationService.processReminders(
                options
            );
        }

        throw new Error(
            "ReminderJob requires ReminderManager or NotificationService"
        );
    }
}

export default ReminderJob;
