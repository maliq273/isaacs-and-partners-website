/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Timers
 * ------------------------------------------------------------
 * Measures execution duration of application operations.
 * ============================================================
 */

export default class Timers {

    constructor() {

        this.active = new Map();

        this.completed = new Map();

        // ====================================================
        // FUTURE INSERT
        //
        // Distributed timing
        // Performance telemetry
        // OpenTelemetry integration
        // Server-side metrics
        // ====================================================
    }


    start(
        name
    ) {

        if (!name) {

            throw new Error(
                "Timer name is required."
            );

        }

        this.active.set(
            name,
            performance.now()
        );

        return this;

    }


    stop(
        name
    ) {

        if (!this.active.has(name)) {

            return null;

        }

        const started =
            this.active.get(name);

        const duration =
            performance.now() -
            started;

        this.active.delete(name);

        if (!this.completed.has(name)) {

            this.completed.set(
                name,
                []
            );

        }

        this.completed
            .get(name)
            .push(duration);

        return duration;

    }


    measure(
        name,
        callback
    ) {

        if (
            typeof callback !==
            "function"
        ) {

            throw new Error(
                "Timer callback must be a function."
            );

        }

        this.start(name);

        try {

            return callback();

        }
        finally {

            this.stop(name);

        }

    }


    getLast(
        name
    ) {

        const values =
            this.completed.get(name);

        if (!values?.length) {

            return null;

        }

        return values[
            values.length - 1
        ];

    }


    getAverage(
        name
    ) {

        const values =
            this.completed.get(name);

        if (!values?.length) {

            return 0;

        }

        return values.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / values.length;

    }


    getAll() {

        const result = {};

        for (
            const [
                name,
                values
            ]
            of this.completed
        ) {

            result[name] = [
                ...values
            ];

        }

        return result;

    }


    reset(
        name = null
    ) {

        if (name) {

            this.active.delete(name);
            this.completed.delete(name);

        }
        else {

            this.active.clear();
            this.completed.clear();

        }

        return this;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Percentile calculations
    // P95/P99 latency
    // Slow-operation detection
    // Performance alerts
    // ========================================================

}
