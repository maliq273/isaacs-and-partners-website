/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ReminderScheduler
 * ------------------------------------------------------------
 * Central reminder execution service.
 * ============================================================
 */

export default class ReminderScheduler {

    constructor(options = {}) {

        this.reminders = new Map();

        this.handlers = new Map();

        this.logger =
            options.logger ?? console;

        this.running = false;

        // ====================================================
        // FUTURE INSERT
        //
        // WhatsApp reminders
        // Email reminders
        // SMS reminders
        // Appointment reminders
        // Document reminders
        // Payment reminders
        // VFS/DHA reminders
        // ====================================================
    }


    registerHandler(
        type,
        handler
    ) {

        if (
            typeof handler !==
            "function"
        ) {

            throw new Error(
                `Reminder handler "${type}" must be a function.`
            );

        }

        this.handlers.set(
            type,
            handler
        );

        return this;

    }


    schedule(
        reminder
    ) {

        if (!reminder?.id) {

            throw new Error(
                "Reminder requires an id."
            );

        }

        if (!reminder?.scheduledFor) {

            throw new Error(
                "Reminder requires scheduledFor."
            );

        }

        this.reminders.set(
            reminder.id,
            {

                ...reminder,

                status:
                    reminder.status ??
                    "PENDING"

            }
        );

        return this;

    }


    cancel(
        reminderId
    ) {

        const reminder =
            this.reminders.get(
                reminderId
            );

        if (!reminder) {

            return false;

        }

        reminder.status =
            "CANCELLED";

        return true;

    }


    async run(
        now = new Date()
    ) {

        if (this.running) {

            return [];

        }

        this.running = true;

        const executed = [];

        try {

            for (
                const reminder
                of this.reminders.values()
            ) {

                if (
                    reminder.status !==
                    "PENDING"
                ) {

                    continue;

                }

                const scheduled =
                    new Date(
                        reminder.scheduledFor
                    );

                if (
                    scheduled > now
                ) {

                    continue;

                }

                const handler =
                    this.handlers.get(
                        reminder.type
                    );

                if (!handler) {

                    reminder.status =
                        "FAILED";

                    reminder.error =
                        `No handler registered for ${reminder.type}`;

                    continue;

                }

                try {

                    await handler(
                        reminder
                    );

                    reminder.status =
                        "SENT";

                    reminder.sentAt =
                        new Date().toISOString();

                    executed.push(
                        reminder
                    );

                } catch (error) {

                    reminder.status =
                        "FAILED";

                    reminder.error =
                        error.message;

                    this.logger.error?.(
                        "Reminder execution failed.",
                        error
                    );

                }

            }

            return executed;

        } finally {

            this.running = false;

        }

    }


    get(
        reminderId
    ) {

        return this.reminders.get(
            reminderId
        ) ?? null;

    }


    pending() {

        return [
            ...this.reminders.values()
        ].filter(
            reminder =>
                reminder.status ===
                "PENDING"
        );

    }

}
