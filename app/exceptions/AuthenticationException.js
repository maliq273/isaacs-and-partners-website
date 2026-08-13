import ApplicationException from "./ApplicationException.js";

/**
 * AuthenticationException
 * ------------------------------------------------------------
 * Authentication failed or authentication state is invalid.
 */

export class AuthenticationException extends ApplicationException {
    constructor(
        message = "Authentication failed",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "AUTHENTICATION_ERROR",
            status:
                options.status || 401
        });

        this.name =
            "AuthenticationException";
    }
}

export default AuthenticationException;
