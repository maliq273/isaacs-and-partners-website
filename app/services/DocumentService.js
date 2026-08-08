/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * DocumentService
 * ============================================================
 *
 * LOCATION
 * app/services/DocumentService.js
 * ============================================================
 */

export default class DocumentService {

    constructor({
        documentRepository = null,
        matterRepository = null,
        knowledgeService = null,
        aiService = null,
        storage = null,
        logger = null
    } = {}) {

        this.documentRepository =
            documentRepository;

        this.matterRepository =
            matterRepository;

        this.knowledgeService =
            knowledgeService;

        this.aiService =
            aiService;

        this.storage =
            storage;

        this.logger =
            logger;

        /*
         * ====================================================
         * FUTURE INSERT
         * DOCUMENT STORAGE PROVIDERS
         *
         * GitHub
         * Supabase Storage
         * Local storage
         * Cloud storage
         * ====================================================
         */

    }

    async createDocument(data = {}) {

        if (!data.name) {
            throw new Error(
                "Document name is required."
            );
        }

        if (
            this.documentRepository &&
            typeof this.documentRepository.create ===
            "function"
        ) {
            return this.documentRepository.create({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        return {
            id:
                `DOC-${Date.now()}`,
            ...data
        };
    }

    async getDocument(documentId) {

        if (
            this.documentRepository &&
            typeof this.documentRepository.findById ===
            "function"
        ) {
            return this.documentRepository.findById(
                documentId
            );
        }

        return null;
    }

    async getMatterDocuments(matterId) {

        if (
            this.documentRepository &&
            typeof this.documentRepository.findByMatterId ===
            "function"
        ) {
            return this.documentRepository.findByMatterId(
                matterId
            );
        }

        return [];
    }

    async uploadDocument({
        matterId = null,
        clientId = null,
        file = null,
        metadata = {}
    } = {}) {

        if (!file) {
            throw new Error(
                "Document file is required."
            );
        }

        /*
         * ====================================================
         * FUTURE INSERT
         * FILE STORAGE ENGINE
         * ====================================================
         */

        return this.createDocument({
            matterId,
            clientId,
            name:
                metadata.name ||
                file.name ||
                "Uploaded Document",
            metadata
        });
    }

    async analyseDocument(
        document
    ) {

        if (
            this.aiService &&
            typeof this.aiService.analyseDocument ===
            "function"
        ) {
            return this.aiService.analyseDocument(
                document
            );
        }

        return {
            documentId:
                document?.id || null,
            status:
                "PENDING"
        };
    }

    async deleteDocument(
        documentId
    ) {

        if (
            this.documentRepository &&
            typeof this.documentRepository.delete ===
            "function"
        ) {
            return this.documentRepository.delete(
                documentId
            );
        }

        return false;
    }

    async getRequiredDocuments(
        matter
    ) {

        if (
            this.knowledgeService &&
            typeof this.knowledgeService
                .getRequiredDocuments ===
            "function"
        ) {
            return this.knowledgeService
                .getRequiredDocuments(
                    matter
                );
        }

        return [];
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * OCR
     * AI classification
     * Document matching
     * Duplicate detection
     * Expiry detection
     * Authenticity analysis
     * PDF generation
     * Bundle compilation
     * VFS bundle
     * DHA bundle
     * Printing queue
     * GitHub archive
     * ========================================================
     */

}
