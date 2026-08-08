/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * BusinessRulesValidator
 * ============================================================
 *
 * LOCATION
 * app/validators/BusinessRulesValidator.js
 *
 * PURPOSE
 * Central business-rule validation layer.
 * ============================================================
 */

export default class BusinessRulesValidator {

    constructor({
        knowledgeService = null,
        matterService = null,
        logger = null
    } = {}) {

        this.knowledgeService =
            knowledgeService;

        this.matterService =
            matterService;

        this.logger =
            logger;

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Business rule registry
         * Rule engine
         * Rule versioning
         * Effective dates
         * ====================================================
         */
    }

    validateMatter(matter) {

        const errors = [];

        if (!matter) {
            return {
                valid: false,
                errors: ["Matter is required."]
            };
        }

        if (!matter.clientId) {
            errors.push(
                "Matter must have a client."
            );
        }

        if (!matter.type) {
            errors.push(
                "Matter type is required."
            );
        }

        if (!matter.department) {
            errors.push(
                "Matter department is required."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    validateDocumentRequirement({
        matter,
        document
    } = {}) {

        const errors = [];

        if (!matter) {
            errors.push(
                "Matter is required."
            );
        }

        if (!document) {
            errors.push(
                "Document is required."
            );
        }

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Dynamic document requirements must eventually be
         * resolved through the KnowledgeService.
         * ====================================================
         */

        return {
            valid: errors.length === 0,
            errors
        };
    }

    validateTransition({
        from,
        to,
        allowedTransitions = []
    } = {}) {

        if (!from || !to) {
            return {
                valid: false,
                errors: [
                    "Current and target states are required."
                ]
            };
        }

        const allowed =
            allowedTransitions.some(
                transition =>
                    transition.from === from &&
                    transition.to === to
            );

        return {
            valid: allowed,
            errors: allowed
                ? []
                : [
                    `Transition from ${from} to ${to} is not permitted.`
                ]
        };
    }

    assert(result) {

        if (!result || !result.valid) {

            const errors =
                result?.errors ||
                ["Business rule validation failed."];

            throw new Error(
                errors.join(" ")
            );
        }

        return true;
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Payment rules
     * Matter rules
     * Staff assignment rules
     * Service eligibility
     * Document rules
     * Workflow rules
     * Submission rules
     * ========================================================
     */
}
