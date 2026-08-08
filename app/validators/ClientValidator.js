/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ClientValidator
 * ============================================================
 *
 * LOCATION
 * app/validators/ClientValidator.js
 * ============================================================
 */

export default class ClientValidator {

    static validate(data = {}) {

        const errors = [];

        if (!data) {
            return {
                valid: false,
                errors: ["Client data is required."]
            };
        }

        if (
            !data.firstName &&
            !data.name &&
            !data.fullName
        ) {
            errors.push(
                "Client name is required."
            );
        }

        if (
            data.email &&
            !this.isValidEmail(data.email)
        ) {
            errors.push(
                "Invalid email address."
            );
        }

        if (
            data.phone &&
            String(data.phone).trim().length < 7
        ) {
            errors.push(
                "Invalid telephone number."
            );
        }

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Passport validation
         * ID validation
         * Country validation
         * Applicant type
         * Client classification
         * ====================================================
         */

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(String(email).trim());
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

    static validateUpdate(
        updates = {}
    ) {

        const errors = [];

        if (
            updates.email &&
            !this.isValidEmail(
                updates.email
            )
        ) {
            errors.push(
                "Invalid email address."
            );
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
     * KYC
     * Duplicate-client detection
     * Passport matching
     * Client portal identity
     * Applicant verification
     * ========================================================
     */
}
