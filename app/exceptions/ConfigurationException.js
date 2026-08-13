import ApplicationException from "./ApplicationException.js";

/**
 * ConfigurationException
 * ------------------------------------------------------------
 * Application configuration or dependency configuration is
 * invalid or incomplete.
 */

export class ConfigurationException extends ApplicationException {
    constructor(
        message = "Invalid application configuration",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "CONFIGURATION_ERROR",
            status:
                options.status || 500
        });

        this.name =
            "ConfigurationException";
    }
}

export default ConfigurationException;
