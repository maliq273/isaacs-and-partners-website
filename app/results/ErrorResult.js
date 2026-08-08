/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ErrorResult
 * ============================================================
 */

import Result from "./Result.js";

export default class ErrorResult
    extends Result {

    constructor(data = {}) {

        super({

            ...data,

            success: false,

            code:
                data.code ??
                "ERROR"

        });

        // ====================================================
        // FUTURE INSERT
        //
        // Domain errors
        // Validation errors
        // Authentication errors
        // Permission errors
        // Storage errors
        // Integration errors
        //
        // ====================================================
    }


    static create(
        message =
            "Operation failed.",
        errors = [],
        options = {}
    ) {

        return new ErrorResult({

            message,

            errors:
                Array.isArray(errors)
                    ? errors
                    : [errors],

            ...options

        });

    }

}
