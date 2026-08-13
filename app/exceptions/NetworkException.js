import ApplicationException from "./ApplicationException.js";

/**
 * NetworkException
 * ------------------------------------------------------------
 * External API, HTTP, synchronization, or network operation
 * failure.
 */

export class NetworkException extends ApplicationException {
    constructor(
        message = "Network operation failed",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "NETWORK_ERROR",
            status:
                options.status || 503
        });

        this.name =
            "NetworkException";
    }
}

export default NetworkException;
