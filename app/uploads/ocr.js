/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * OCR Upload Module
 * ============================================================
 *
 * LOCATION
 * app/uploads/ocr.js
 *
 * PURPOSE
 * Coordinates OCR processing for uploaded documents.
 *
 * Actual OCR should be performed by the OCR/AI service layer.
 * ============================================================
 */

const OCRUpload = {

    version: "1.0.0",

    /**
     * ========================================================
     * ANALYSE FILE
     * ========================================================
     */

    async analyse(
        file,
        {
            ocrService = null,
            documentId = null,
            matterId = null
        } = {}
    ) {

        if (!file) {

            throw new Error(
                "OCR requires an uploaded file."
            );

        }

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Connect to:
         *
         * app/ai/analysis/OCRAnalysis.js
         *
         * and/or
         *
         * external OCR provider.
         * ====================================================
         */

        if (
            ocrService &&
            typeof ocrService.analyse ===
                "function"
        ) {

            return ocrService.analyse(
                file,
                {
                    documentId,
                    matterId
                }
            );

        }

        return {

            success: false,

            status: "PENDING",

            text: "",

            confidence: 0,

            documentId,

            matterId,

            message:
                "OCR service is not connected."

        };

    },

    /**
     * ========================================================
     * NORMALISE OCR RESULT
     * ========================================================
     */

    normaliseResult(
        result = {}
    ) {

        return {

            success:
                result.success === true,

            status:
                result.status ||
                "UNKNOWN",

            text:
                result.text ||
                "",

            confidence:
                Number(
                    result.confidence || 0
                ),

            pages:
                result.pages ||
                [],

            metadata:
                result.metadata ||
                {}

        };

    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * OCR PIPELINE
     *
     * Upload
     *   ↓
     * File validation
     *   ↓
     * OCR
     *   ↓
     * Text extraction
     *   ↓
     * Document classification
     *   ↓
     * Entity extraction
     *   ↓
     * Document matching
     *   ↓
     * Matter update
     *
     * ========================================================
     */

};

export default OCRUpload;
