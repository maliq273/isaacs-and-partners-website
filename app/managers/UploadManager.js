/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Upload Manager
 * ============================================================
 */

export default class UploadManager {

    constructor({
        storage = null,
        validator = null,
        documentService = null,
        logger = null
    } = {}) {

        this.storage = storage;
        this.validator = validator;
        this.documentService =
            documentService;
        this.logger = logger;

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // OCR pipeline
        // Virus scanning
        // File hashing
        // AI document classification
        // Document matching
        // ====================================================
    }


    async upload(
        file,
        context = {}
    ) {

        if (!file) {

            throw new Error(
                "Upload file is required."
            );

        }

        if (
            this.validator &&
            typeof this.validator.validate ===
            "function"
        ) {

            this.validator.validate(
                file,
                context
            );

        }

        if (
            !this.storage ||
            typeof this.storage.save !==
            "function"
        ) {

            throw new Error(
                "Upload storage provider is not configured."
            );

        }

        const stored =
            await this.storage.save(
                file,
                context
            );

        if (
            this.documentService &&
            typeof this.documentService.create ===
            "function"
        ) {

            return this.documentService.create({
                ...stored,
                ...context
            });

        }

        return stored;

    }


    async remove(
        fileId
    ) {

        if (
            !this.storage ||
            typeof this.storage.delete !==
            "function"
        ) {

            throw new Error(
                "Upload storage provider is not configured."
            );

        }

        return this.storage.delete(
            fileId
        );

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // OCR
    // Passport extraction
    // Document AI matching
    // Duplicate detection
    // VFS/DHA bundle matching
    // Upload progress tracking
    // ========================================================

}
