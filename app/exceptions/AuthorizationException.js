import ApplicationException from "./ApplicationException.js";

/**
 * AuthorizationException
 * ------------------------------------------------------------
 * Authenticated user does not have permission to perform the
 * requested operation.
 */

export class AuthorizationException extends ApplicationException {
    constructor(
        message = "Access denied",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "AUTHORIZATION_ERROR",
            status:
                options.status || 403
        });

        this.name =
            "AuthorizationException";
    }
}

export default AuthorizationException;
