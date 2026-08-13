import ApplicationException from "./ApplicationException.js";

/**
 * RepositoryException
 * ------------------------------------------------------------
 * Persistence/repository operation failure.
 */

export class RepositoryException extends ApplicationException {
    constructor(
        message = "Repository operation failed",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "REPOSITORY_ERROR",
            status:
                options.status || 500
        });

        this.name =
            "RepositoryException";
    }
}

export default RepositoryException;
