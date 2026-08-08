/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * KnowledgeValidator
 * ============================================================
 *
 * LOCATION
 * app/validators/KnowledgeValidator.js
 * ============================================================
 */

export default class KnowledgeValidator {

    static validate(entry = {}) {

        const errors = [];

        if (!entry) {
            return {
                valid: false,
                errors: [
                    "Knowledge entry is required."
                ]
            };
        }

        if (!entry.id) {
            errors.push(
                "Knowledge entry ID is required."
            );
        }

        if (!entry.category) {
            errors.push(
                "Knowledge category is required."
            );
        }

        if (
            !entry.title &&
            !entry.name
        ) {
            errors.push(
                "Knowledge title is required."
            );
        }

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Source validation
         * Authority validation
         * Version validation
         * Effective date
         * Expiry date
         * Citation validation
         * ====================================================
         */

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static validateCollection(
        entries = []
    ) {

        const results =
            entries.map(
                entry => this.validate(entry)
            );

        const errors =
            results.flatMap(
                result => result.errors
            );

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static assert(entry = {}) {

        const result =
            this.validate(entry);

        if (!result.valid) {
            throw new Error(
                result.errors.join(" ")
            );
        }

        return true;
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Legislative source hierarchy
     * Immigration knowledge
     * DHA
     * VFS
     * Labour
     * CCMA
     * Business
     * Legal
     * ========================================================
     */
}
