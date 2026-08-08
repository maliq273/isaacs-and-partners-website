/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Upload Validator Adapter
 * ============================================================
 *
 * LOCATION
 * app/uploads/validator.js
 *
 * PURPOSE
 * Front-end adapter around the central UploadValidator.
 * ============================================================
 */

import UploadValidator
    from "../validators/UploadValidator.js";

const UploadValidation = {

    /**
     * ========================================================
     * VALIDATE FILE
     * ========================================================
     */

    validate(file, options = {}) {

        return UploadValidator.validate(
            file,
            options
        );

    },

    /**
     * ========================================================
     * VALIDATE MULTIPLE FILES
     * ========================================================
     */

    validateMany(
        files = [],
        options = {}
    ) {

        const results =
            files.map(
                file =>
                    ({
                        file,

                        ...this.validate(
                            file,
                            options
                        )

                    })
            );

        return {

            valid:
                results.every(
                    result =>
                        result.valid
                ),

            results,

            errors:
                results.flatMap(
                    result =>
                        result.errors
                )

        };

    },

    /**
     * ========================================================
     * FILE EXTENSION
     * ========================================================
     */

    getExtension(filename) {

        return UploadValidator
            .getExtension(
                filename
            );

    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Client-side:
     * - MIME verification
     * - File signature checks
     * - Duplicate detection
     * - Virus scanning status
     *
     * Server-side validation remains authoritative.
     * ========================================================
     */

};

export default UploadValidation;
