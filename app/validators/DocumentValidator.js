/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * DocumentValidator
 * ============================================================
 *
 * LOCATION
 * app/validators/DocumentValidator.js
 * ============================================================
 */

export default class DocumentValidator {

    static validate(data = {}) {

        const errors = [];

        if (!data) {
            return {
                valid: false,
                errors: ["Document data is required."]
            };
        }

        if (!data.name) {
            errors.push(
                "Document name is required."
            );
        }

        if (!data.matterId) {
            errors.push(
                "Matter ID is required."
            );
        }

        if (
            data.fileName === "" &&
            data.file === null
        ) {
            errors.push(
                "Document file is required."
            );
        }

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Document type validation
         * MIME validation
         * PDF validation
         * File signature validation
         * Expiry validation
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

    static validateFile(file) {

        const errors = [];

        if (!file) {
            errors.push(
                "File is required."
            );

            return {
                valid: false,
                errors
            };
        }

        if (
            file.size !== undefined &&
            file.size <= 0
        ) {
            errors.push(
                "File cannot be empty."
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
     * Allowed extensions
     * Maximum file size
     * Virus scanning
     * OCR requirements
     * AI document classification
     * Document authenticity
     * ========================================================
     */
}
