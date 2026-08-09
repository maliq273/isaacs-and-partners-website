/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Counters
 * ------------------------------------------------------------
 * Numeric counters for application and business events.
 * ============================================================
 */

export default class Counters {

    constructor(data = {}) {

        this.values = {
            ...(data.values ?? {})
        };

        this.createdAt =
            data.createdAt ??
            new Date().toISOString();

        this.updatedAt =
            data.updatedAt ??
            this.createdAt;

        // ====================================================
        // FUTURE INSERT
        //
        // Database-backed counters
        // Redis counters
        // Distributed counters
        // Tenant-specific counters
        // Daily/monthly counter partitions
        // ====================================================
    }


    increment(
        name,
        amount = 1
    ) {

        if (!name) {

            throw new Error(
                "Counter name is required."
            );

        }

        const value =
            Number(amount);

        if (!Number.isFinite(value)) {

            throw new Error(
                "Counter increment must be numeric."
            );

        }

        this.values[name] =
            Number(this.values[name] ?? 0) +
            value;

        this.touch();

        return this.values[name];

    }


    decrement(
        name,
        amount = 1
    ) {

        return this.increment(
            name,
            -Number(amount)
        );

    }


    get(
        name,
        fallback = 0
    ) {

        return (
            this.values[name] ??
            fallback
        );

    }


    set(
        name,
        value
    ) {

        if (!name) {

            throw new Error(
                "Counter name is required."
            );

        }

        if (!Number.isFinite(Number(value))) {

            throw new Error(
                "Counter value must be numeric."
            );

        }

        this.values[name] =
            Number(value);

        this.touch();

        return this;

    }


    reset(
        name
    ) {

        if (name) {

            delete this.values[name];

        }
        else {

            this.values = {};

        }

        this.touch();

        return this;

    }


    all() {

        return {
            ...this.values
        };

    }


    touch() {

        this.updatedAt =
            new Date().toISOString();

        return this;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Business event counters
    // Matter counters
    // Document counters
    // Invoice counters
    // Booking counters
    // AI execution counters
    // ========================================================

}
