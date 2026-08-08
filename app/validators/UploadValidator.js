/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * UploadValidator
 * ============================================================
 *
 * LOCATION
 * app/validators/UploadValidator.js
 * ============================================================
 */

export default class UploadValidator {

    static validate(
        file,
        options = {}
    ) {

        const errors = [];

        if (!file) {
            return {
                valid: false,
                errors: [
                    "Upload file is required."
                ]
            };
        }

        const {
            maxSize =
                25 * 1024 * 1024,

            allowedTypes = [

                "application/pdf",

                "image/jpeg",

                "image/png",

                "application/msword",

                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

            ]
        } = options;

        if (
            file.size !== undefined &&
            file.size > maxSize
        ) {
            errors.push(
                "Uploaded file exceeds the maximum permitted size."
            );
        }

        if (
            file.type &&
            allowedTypes.length > 0 &&
            !allowedTypes.includes(
                file.type
            )
        ) {
            errors.push(
                `Unsupported file type: ${file.type}`
            );
        }

        if (
            file.name &&
            file.name.includes("..")
        ) {
            errors.push(
                "Invalid filename."
            );
        }

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Virus scanning
         * Malware scanning
         * File signature validation
         * Filename sanitisation
         * Duplicate detection
         * OCR readiness
         * ====================================================
         */

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static assert(
        file,
        options = {}
    ) {

        const result =
            this.validate(
                file,
                options
            );

        if (!result.valid) {
            throw new Error(
                result.errors.join(" ")
            );
        }

        return true;
    }

    static getExtension(
        filename = ""
    ) {

        const parts =
            String(filename)
                .split(".");

        if (parts.length < 2) {
            return "";
        }

        return parts
            .pop()
            .toLowerCase();
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * PDF security
     * ZIP security
     * Executable rejection
     * Image validation
     * OCR pipeline
     * AI document matching
     * ========================================================
     */
}
