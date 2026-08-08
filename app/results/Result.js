/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Result
 * ------------------------------------------------------------
 * Base result object used across the application.
 * All specialised results extend this class.
 * ============================================================
 */

export default class Result {

    constructor(data = {}) {

        this.success =
            Boolean(data.success ?? true);

        this.code =
            data.code ??
            (this.success
                ? "SUCCESS"
                : "ERROR");

        this.message =
            data.message ?? "";

        this.data =
            data.data ?? null;

        this.errors =
            Array.isArray(data.errors)
                ? [...data.errors]
                : [];

        this.warnings =
            Array.isArray(data.warnings)
                ? [...data.warnings]
                : [];

        this.metadata =
            data.metadata ?? {};

        this.timestamp =
            data.timestamp ??
            new Date().toISOString();

        this.requestId =
            data.requestId ?? null;

        // ====================================================
        // FUTURE INSERT
        //
        // API response envelope
        // Correlation IDs
        // Audit metadata
        // Permission metadata
        // Trace information
        //
        // ====================================================
    }


    static success(
        data = null,
        message = "Operation completed successfully.",
        options = {}
    ) {

        return new Result({

            success: true,

            code:
                options.code ??
                "SUCCESS",

            message,

            data,

            metadata:
                options.metadata ?? {},

            requestId:
                options.requestId ?? null

        });

    }


    static failure(
        message = "Operation failed.",
        errors = [],
        options = {}
    ) {

        return new Result({

            success: false,

            code:
                options.code ??
                "ERROR",

            message,

            errors:
                Array.isArray(errors)
                    ? errors
                    : [errors],

            metadata:
                options.metadata ?? {},

            requestId:
                options.requestId ?? null

        });

    }


    isSuccess() {

        return this.success === true;

    }


    isFailure() {

        return !this.isSuccess();

    }


    addError(
        error
    ) {

        this.errors.push(
            error
        );

        this.success = false;

        return this;

    }


    addWarning(
        warning
    ) {

        this.warnings.push(
            warning
        );

        return this;

    }


    toJSON() {

        return {

            success:
                this.success,

            code:
                this.code,

            message:
                this.message,

            data:
                this.data,

            errors: [
                ...this.errors
            ],

            warnings: [
                ...this.warnings
            ],

            metadata: {
                ...this.metadata
            },

            timestamp:
                this.timestamp,

            requestId:
                this.requestId

        };

    }

}
