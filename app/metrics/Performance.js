/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Performance
 * ------------------------------------------------------------
 * Application performance measurements.
 * ============================================================
 */

export default class Performance {

    constructor(data = {}) {

        this.operations = {
            ...(data.operations ?? {})
        };

        this.startedAt =
            data.startedAt ??
            new Date().toISOString();

        // ====================================================
        // FUTURE INSERT
        //
        // Core Web Vitals
        // API latency
        // Database latency
        // AI execution latency
        // Memory monitoring
        // CPU monitoring
        // ====================================================
    }


    record(
        operation,
        duration,
        metadata = {}
    ) {

        if (!operation) {

            throw new Error(
                "Performance operation is required."
            );

        }

        const value =
            Number(duration);

        if (!Number.isFinite(value)) {

            throw new Error(
                "Performance duration must be numeric."
            );

        }

        if (!this.operations[operation]) {

            this.operations[operation] = [];

        }

        this.operations[operation].push({

            duration: value,

            timestamp:
                new Date().toISOString(),

            metadata: {
                ...metadata
            }

        });

        return this;

    }


    get(
        operation
    ) {

        return [
            ...(this.operations[operation] ?? [])
        ];

    }


    getAverage(
        operation
    ) {

        const values =
            this.get(operation);

        if (!values.length) {

            return 0;

        }

        return values.reduce(
            (sum, item) =>
                sum + item.duration,
            0
        ) / values.length;

    }


    getSlowest(
        operation
    ) {

        const values =
            this.get(operation);

        if (!values.length) {

            return null;

        }

        return values.reduce(
            (slowest, current) =>
                current.duration >
                slowest.duration
                    ? current
                    : slowest
        );

    }


    getSummary() {

        const summary = {};

        for (
            const operation
            of Object.keys(
                this.operations
            )
        ) {

            summary[operation] = {

                count:
                    this.operations[
                        operation
                    ].length,

                average:
                    this.getAverage(
                        operation
                    ),

                slowest:
                    this.getSlowest(
                        operation
                    )

            };

        }

        return summary;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Performance thresholds
    // Automated alerts
    // Health scoring
    // Bottleneck analysis
    // ========================================================

}
