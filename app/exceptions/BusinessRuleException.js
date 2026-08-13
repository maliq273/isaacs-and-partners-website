import ApplicationException from "./ApplicationException.js";

/**
 * BusinessRuleException
 * ------------------------------------------------------------
 * Raised when an operation violates an application/business
 * rule.
 */

export class BusinessRuleException extends ApplicationException {
    constructor(
        message = "Business rule violated",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "BUSINESS_RULE_ERROR",
            status:
                options.status || 422
        });

        this.name =
            "BusinessRuleException";
    }
}

export default BusinessRuleException;
