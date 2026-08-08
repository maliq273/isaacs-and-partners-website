/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Logger
 * ============================================================
 */

const LEVELS = Object.freeze({

    DEBUG: 10,

    INFO: 20,

    WARN: 30,

    ERROR: 40,

    CRITICAL: 50

});


class Logger {

    constructor(options = {}) {

        this.level =
            options.level ??
            "INFO";

        this.context =
            options.context ??
            "APPLICATION";

        this.enabled =
            options.enabled ??
            true;

        // =====================================================
        // FUTURE INSERT
        // Remote logging
        // Audit logging
        // Sentry integration
        // Security event logging
        // =====================================================

    }


    shouldLog(level) {

        if (!this.enabled) {

            return false;

        }

        return (
            LEVELS[level] >=
            LEVELS[this.level]
        );

    }


    write(
        level,
        message,
        metadata = {}
    ) {

        if (
            !this.shouldLog(level)
        ) {

            return;

        }

        const entry = {

            timestamp:
                new Date().toISOString(),

            level,

            context:
                this.context,

            message,

            metadata

        };


        const output =
            JSON.stringify(
                entry
            );


        if (
            level === "ERROR" ||
            level === "CRITICAL"
        ) {

            console.error(
                output
            );

        } else if (
            level === "WARN"
        ) {

            console.warn(
                output
            );

        } else {

            console.log(
                output
            );

        }


        return entry;

    }


    debug(
        message,
        metadata = {}
    ) {

        return this.write(
            "DEBUG",
            message,
            metadata
        );

    }


    info(
        message,
        metadata = {}
    ) {

        return this.write(
            "INFO",
            message,
            metadata
        );

    }


    warn(
        message,
        metadata = {}
    ) {

        return this.write(
            "WARN",
            message,
            metadata
        );

    }


    error(
        message,
        metadata = {}
    ) {

        return this.write(
            "ERROR",
            message,
            metadata
        );

    }


    critical(
        message,
        metadata = {}
    ) {

        return this.write(
            "CRITICAL",
            message,
            metadata
        );

    }


    child(
        context
    ) {

        return new Logger({

            level:
                this.level,

            enabled:
                this.enabled,

            context:
                `${this.context}:${context}`

        });

    }

}


export const logger =
    new Logger();

export {
    Logger,
    LEVELS
};

export default logger;


// ============================================================
// FUTURE INSERT
//
// AuditLogger
// SecurityLogger
// AIExecutionLogger
// DocumentLogger
// MatterLogger
//
// ============================================================
