/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * FollowUpScheduler
 * ------------------------------------------------------------
 * Handles scheduled client/matter follow-ups.
 * ============================================================
 */

export default class FollowUpScheduler {

    constructor(options = {}) {

        this.followUps = new Map();

        this.handler =
            options.handler ?? null;

        this.logger =
            options.logger ?? console;

        // ====================================================
        // FUTURE INSERT
        //
        // AI-generated follow-up dates
        // Client communication
        // Applicant WhatsApp follow-ups
        // Outstanding document follow-ups
        // Matter escalation
        // ====================================================
    }


    setHandler(
        handler
    ) {

        if (
            typeof handler !==
            "function"
        ) {

            throw new Error(
                "Follow-up handler must be a function."
            );

        }

        this.handler =
            handler;

        return this;

    }


    schedule(
        data = {}
    ) {

        if (!data.id) {

            throw new Error(
                "Follow-up requires an id."
            );

        }

        if (!data.scheduledFor) {

            throw new Error(
                "Follow-up requires scheduledFor."
            );

        }

        this.followUps.set(
            data.id,
            {

                ...data,

                status:
                    data.status ??
                    "PENDING",

                createdAt:
                    data.createdAt ??
                    new Date().toISOString()

            }
        );

        return this;

    }


    cancel(
        id
    ) {

        const followUp =
            this.followUps.get(
                id
            );

        if (!followUp) {

            return false;

        }

        followUp.status =
            "CANCELLED";

        return true;

    }


    async run(
        now = new Date()
    ) {

        const processed = [];

        for (
            const followUp
            of this.followUps.values()
        ) {

            if (
                followUp.status !==
                "PENDING"
            ) {

                continue;

            }

            if (
                new Date(
                    followUp.scheduledFor
                ) > now
            ) {

                continue;

            }

            if (!this.handler) {

                followUp.status =
                    "FAILED";

                followUp.error =
                    "No follow-up handler configured.";

                continue;

            }

            try {

                await this.handler(
                    followUp
                );

                followUp.status =
                    "COMPLETED";

                followUp.completedAt =
                    new Date().toISOString();

                processed.push(
                    followUp
                );

            } catch (error) {

                followUp.status =
                    "FAILED";

                followUp.error =
                    error.message;

                this.logger.error?.(
                    "Follow-up failed.",
                    error
                );

            }

        }

        return processed;

    }


    getPending() {

        return [
            ...this.followUps.values()
        ].filter(
            item =>
                item.status ===
                "PENDING"
        );

    }

}
