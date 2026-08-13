/**
 * AIException
 * ------------------------------------------------------------
 * AI-specific application exception.
 */

export class AIException extends Error {
    constructor(
        message = "AI operation failed",
        {
            code = "AI_ERROR",
            cause = null,
            details = {},
            status = 500
        } = {}
    ) {
        super(message, { cause });

        this.name = "AIException";
        this.code = code;
        this.status = status;
        this.details = details;
        this.timestamp =
            new Date().toISOString();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(
                this,
                AIException
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
            timestamp: this.timestamp
        };
    }
}

export default AIException;
