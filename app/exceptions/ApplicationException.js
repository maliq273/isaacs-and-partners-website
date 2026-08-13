/**
 * ApplicationException
 * ------------------------------------------------------------
 * Base exception for the Isaacs & Partners application.
 *
 * All application-specific exceptions should ultimately extend
 * this class.
 */

export class ApplicationException extends Error {
    constructor(
        message = "Application error",
        {
            code = "APPLICATION_ERROR",
            status = 500,
            cause = null,
            details = {},
            isOperational = true
        } = {}
    ) {
        super(message, { cause });

        this.name =
            "ApplicationException";

        this.code = code;
        this.status = status;
        this.details = details;
        this.isOperational =
            isOperational;

        this.timestamp =
            new Date().toISOString();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(
                this,
                ApplicationException
            );
        }
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            status: this.status,
            details: this.details,
            isOperational:
                this.isOperational,
            timestamp: this.timestamp
        };
    }

    static from(error, options = {}) {
        if (
            error instanceof
            ApplicationException
        ) {
            return error;
        }

        return new ApplicationException(
            error?.message ||
                "Application error",
            {
                ...options,
                cause: error
            }
        );
    }
}

export default ApplicationException;
