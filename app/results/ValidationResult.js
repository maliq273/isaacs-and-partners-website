/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ValidationResult
 * ============================================================
 */

import Result from "./Result.js";

export default class ValidationResult
    extends Result {

    constructor(data = {}) {

        super({

            ...data,

            success:
                data.valid ??
                data.success ??
                true,

            code:
                data.code ??
                (
                    data.valid === false
                        ? "VALIDATION_FAILED"
                        : "VALIDATION_SUCCESS"
                )

        });

        this.valid =
            data.valid ??
            this.success;

        this.fieldErrors =
            data.fieldErrors ?? {};

        this.rules =
            Array.isArray(data.rules)
                ? [...data.rules]
                : [];

        // ====================================================
        // FUTURE INSERT
        //
        // Business rules
        // Immigration requirements
        // Form validation
        // Document requirements
        // Workflow validation
        // Compliance validation
        //
        // ====================================================
    }


    hasErrors() {

        return (
            !this.valid ||
            Object.keys(
                this.fieldErrors
            ).length > 0 ||
            this.errors.length > 0
        );

    }


    addFieldError(
        field,
        message
    ) {

        if (
            !this.fieldErrors[field]
        ) {

            this.fieldErrors[field] = [];

        }

        this.fieldErrors[field].push(
            message
        );

        this.valid = false;

        this.success = false;

        return this;

    }

}
