/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * WeeklyScheduler
 * ============================================================
 */

export default class WeeklyScheduler {

    constructor(options = {}) {

        this.jobs = new Map();

        this.running = false;

        this.lastRunAt = null;

        this.logger =
            options.logger ?? console;

        // ====================================================
        // FUTURE INSERT
        //
        // Weekly:
        // - management reports
        // - matter review
        // - overdue follow-ups
        // - staff workload review
        // - compliance review
        // - immigration case review
        //
        // ====================================================
    }


    register(
        name,
        handler
    ) {

        if (
            typeof handler !==
            "function"
        ) {

            throw new Error(
                `Weekly job "${name}" must be a function.`
            );

        }

        this.jobs.set(
            name,
            handler
        );

        return this;

    }


    unregister(
        name
    ) {

        this.jobs.delete(
            name
        );

        return this;

    }


    async run(
        context = {}
    ) {

        if (this.running) {

            return {

                success: false,

                reason:
                    "Weekly scheduler is already running."

            };

        }

        this.running = true;

        const results = [];

        try {

            for (
                const [
                    name,
                    handler
                ]
                of this.jobs
            ) {

                try {

                    const result =
                        await handler(
                            context
                        );

                    results.push({

                        name,

                        success: true,

                        result

                    });

                } catch (error) {

                    this.logger.error?.(
                        `Weekly job failed: ${name}`,
                        error
                    );

                    results.push({

                        name,

                        success: false,

                        error:
                            error.message

                    });

                }

            }

            this.lastRunAt =
                new Date().toISOString();

            return {

                success: true,

                executed:
                    results.length,

                results,

                completedAt:
                    this.lastRunAt

            };

        } finally {

            this.running = false;

        }

    }


    listJobs() {

        return [
            ...this.jobs.keys()
        ];

    }

}
