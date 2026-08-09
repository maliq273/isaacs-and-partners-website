/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Metrics
 * ------------------------------------------------------------
 * Central metrics facade.
 *
 * Combines:
 * Counters
 * Timers
 * Performance
 * Usage
 * ============================================================
 */

import Counters from "./Counters.js";
import Timers from "./Timers.js";
import Performance from "./Performance.js";
import Usage from "./Usage.js";

export default class Metrics {

    constructor(data = {}) {

        this.counters =
            data.counters instanceof Counters
                ? data.counters
                : new Counters(
                    data.counters
                );

        this.timers =
            data.timers instanceof Timers
                ? data.timers
                : new Timers();

        this.performance =
            data.performance instanceof Performance
                ? data.performance
                : new Performance(
                    data.performance
                );

        this.usage =
            data.usage instanceof Usage
                ? data.usage
                : new Usage(
                    data.usage
                );

        // ====================================================
        // FUTURE INSERT
        //
        // Metrics persistence
        // Remote telemetry
        // Dashboard aggregation
        // AI monitoring
        // ====================================================
    }


    increment(
        name,
        amount = 1
    ) {

        return this.counters.increment(
            name,
            amount
        );

    }


    startTimer(
        name
    ) {

        return this.timers.start(
            name
        );

    }


    stopTimer(
        name
    ) {

        return this.timers.stop(
            name
        );

    }


    recordPerformance(
        operation,
        duration,
        metadata = {}
    ) {

        return this.performance.record(
            operation,
            duration,
            metadata
        );

    }


    trackUsage(
        feature,
        amount = 1
    ) {

        return this.usage.trackFeature(
            feature,
            amount
        );

    }


    snapshot() {

        return {

            counters:
                this.counters.all(),

            performance:
                this.performance.getSummary(),

            usage:
                this.usage.getSummary()

        };

    }


    reset() {

        this.counters.reset();
        this.timers.reset();
        this.performance =
            new Performance();
        this.usage.reset();

        return this;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Metrics events
    // Persistence adapter
    // Reporting integration
    // AI diagnostics integration
    // ========================================================

}
