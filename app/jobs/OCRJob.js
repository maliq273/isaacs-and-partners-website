/**
 * OCRJob
 * ------------------------------------------------------------
 * Processes uploaded documents through OCR.
 *
 * Intended to integrate with:
 * - UploadManager
 * - DocumentService
 * - OCR engine
 *
 * OCR output must remain evidence-derived and must not be
 * treated as legal interpretation by this job.
 */

export class OCRJob {
    constructor({
        ocrService = null,
        documentService = null,
        uploadManager = null,
        logger = console
    } = {}) {
        this.ocrService = ocrService;
        this.documentService = documentService;
        this.uploadManager = uploadManager;
        this.logger = logger;
        this.name = "OCRJob";
    }

    async execute(document = {}) {
        const startedAt = Date.now();

        try {
            const result =
                await this.process(
                    document
                );

            return {
                success: true,
                job: this.name,
                startedAt,
                completedAt: Date.now(),
                duration:
                    Date.now() - startedAt,
                result
            };
        } catch (error) {
            this.logger.error(
                `${this.name} failed`,
                error
            );

            return {
                success: false,
                job: this.name,
                startedAt,
                completedAt: Date.now(),
                error: {
                    message:
                        error?.message ||
                        "OCR processing failed"
                }
            };
        }
    }

    async process(document) {
        if (
            this.ocrService &&
            typeof this.ocrService.process ===
                "function"
        ) {
            return this.ocrService.process(
                document
            );
        }

        if (
            this.documentService &&
            typeof this.documentService.ocr ===
                "function"
        ) {
            return this.documentService.ocr(
                document
            );
        }

        if (
            this.uploadManager &&
            typeof this.uploadManager.processOCR ===
                "function"
        ) {
            return this.uploadManager.processOCR(
                document
            );
        }

        throw new Error(
            "OCRJob requires an OCR-capable service"
        );
    }
}

export default OCRJob;
