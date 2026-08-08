/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Upload Controller
 * ============================================================
 *
 * LOCATION
 * app/uploads/upload.js
 *
 * PURPOSE
 * Central browser-side upload controller.
 * ============================================================
 */

import UploadValidation
    from "./validator.js";

import UploadPreview
    from "./preview.js";

import UploadChecklist
    from "./checklist.js";

import OCRUpload
    from "./ocr.js";

const UploadController = {

    /**
     * ========================================================
     * INITIALISE
     * ========================================================
     */

    initialise({
        input = null,
        onSelected = null,
        onError = null
    } = {}) {

        if (!input) {
            return null;
        }

        input.addEventListener(
            "change",
            async event => {

                try {

                    const files =
                        Array.from(
                            event.target.files ||
                            []
                        );

                    const result =
                        await this.processFiles(
                            files
                        );

                    if (
                        typeof onSelected ===
                        "function"
                    ) {

                        onSelected(
                            result
                        );

                    }

                } catch (error) {

                    if (
                        typeof onError ===
                        "function"
                    ) {

                        onError(
                            error
                        );

                    } else {

                        console.error(
                            error
                        );

                    }

                }

            }
        );

        return input;

    },

    /**
     * ========================================================
     * PROCESS FILES
     * ========================================================
     */

    async processFiles(
        files = [],
        options = {}
    ) {

        const validation =
            UploadValidation
                .validateMany(
                    files,
                    options.validation || {}
                );

        const validFiles =
            validation.results
                .filter(
                    result =>
                        result.valid
                )
                .map(
                    result =>
                        result.file
                );

        const previews =
            validFiles.map(
                file =>
                    UploadPreview.create(
                        file
                    )
            );

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Upload valid files to:
         *
         * DocumentService
         * StorageFactory
         * Repository layer
         *
         * ====================================================
         */

        const ocrResults = [];

        if (
            options.runOCR === true
        ) {

            for (
                const file
                of validFiles
            ) {

                const result =
                    await OCRUpload.analyse(
                        file,
                        options.ocr || {}
                    );

                ocrResults.push(
                    result
                );

            }

        }

        return {

            valid:
                validation.valid,

            files:
                validFiles,

            rejected:
                validation.results
                    .filter(
                        result =>
                            !result.valid
                    ),

            previews,

            ocrResults,

            errors:
                validation.errors

        };

    },

    /**
     * ========================================================
     * BUILD CHECKLIST
     * ========================================================
     */

    buildChecklist({
        matter = null,
        requiredDocuments = [],
        existingDocuments = []
    } = {}) {

        return UploadChecklist.create({
            matter,
            requiredDocuments,
            existingDocuments
        });

    },

    /**
     * ========================================================
     * RELEASE PREVIEWS
     * ========================================================
     */

    releasePreviews(
        previews = []
    ) {

        previews.forEach(
            preview =>
                UploadPreview.release(
                    preview
                )
        );

    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * PRODUCTION UPLOAD PIPELINE
     *
     * Browser
     *   ↓
     * UploadController
     *   ↓
     * UploadValidator
     *   ↓
     * StorageFactory
     *   ↓
     * DocumentService
     *   ↓
     * DocumentRepository
     *   ↓
     * OCRAnalysis
     *   ↓
     * DocumentAnalysis
     *   ↓
     * KnowledgeService
     *   ↓
     * Matter
     *
     * ========================================================
     */

};

export default UploadController;
