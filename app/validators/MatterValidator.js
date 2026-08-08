/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * MatterValidator
 * ============================================================
 *
 * LOCATION
 * app/validators/MatterValidator.js
 * ============================================================
 */

export default class MatterValidator {

    static validate(data = {}) {

        const errors = [];

        if (!data) {
            return {
                valid: false,
                errors: ["Matter data is required."]
            };
        }

        if (!data.title) {
            errors.push(
                "Matter title is required."
            );
        }

        if (!data.type) {
            errors.push(
                "Matter type is required."
            );
        }

        if (!data.department) {
            errors.push(
                "Matter department is required."
            );
        }

        if (!data.clientId) {
            errors.push(
                "Client ID is required."
            );
        }

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Matter type rules
         * Department rules
         * Service rules
         * Matter source rules
         * Visibility rules
         * ====================================================
         */

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static assert(data = {}) {

        const result =
            this.validate(data);

        if (!result.valid) {
            throw new Error(
                result.errors.join(" ")
            );
        }

        return true;
    }

    static validateStatusChange({
        currentStatus,
        newStatus,
        allowedTransitions = []
    } = {}) {

        const errors = [];

        if (!currentStatus) {
            errors.push(
                "Current matter status is required."
            );
        }

        if (!newStatus) {
            errors.push(
                "New matter status is required."
            );
        }

        if (
            currentStatus &&
            newStatus &&
            allowedTransitions.length > 0
        ) {

            const allowed =
                allowedTransitions.some(
                    transition =>
                        transition.from ===
                        currentStatus &&
                        transition.to ===
                        newStatus
                );

            if (!allowed) {
                errors.push(
                    `Matter status transition from ${currentStatus} to ${newStatus} is not permitted.`
                );
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Matter lifecycle
     * AI readiness
     * Required documents
     * Assignment rules
     * Closure rules
     * Escalation rules
     * ========================================================
     */
}
