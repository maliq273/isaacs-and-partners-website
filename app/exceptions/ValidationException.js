import ApplicationException from "./ApplicationException.js";

/**
 * ValidationException
 * ------------------------------------------------------------
 * Input, domain, document, workflow, or business validation
 * failure.
 */

export class ValidationException extends ApplicationException {
    constructor(
        message = "Validation failed",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "VALIDATION_ERROR",
            status:
                options.status || 422
        });

        this.name =
            "ValidationException";

        this.fields =
            options.fields || {};
    }

    toJSON() {
        return {
            ...super.toJSON(),
            fields: this.fields
        };
    }
}

export default ValidationException;
