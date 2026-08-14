/**
 * DocumentEngine
 * ------------------------------------------------------------
 * Central document-processing orchestration.
 *
 * Connects:
 * - DocumentService
 * - DocumentRepository
 * - OCR/upload layer
 * - DocumentValidator
 * - KnowledgeEngine
 */

export class DocumentEngine {
    constructor({
        documentService = null,
        documentRepository = null,
        validator = null,
        ocr = null,
        knowledgeEngine = null,
        eventDispatcher = null,
        logger = console
    } = {}) {
        this.documentService =
            documentService;
        this.documentRepository =
            documentRepository;
        this.validator = validator;
        this.ocr = ocr;
        this.knowledgeEngine =
            knowledgeEngine;
        this.eventDispatcher =
            eventDispatcher;
        this.logger = logger;
    }

    async process(
        document,
        options = {}
    ) {
        if (!document) {
            throw new Error(
                "Document is required"
            );
        }

        let result = {
            document
        };

        if (
            options.ocr !== false &&
            this.ocr
        ) {
            result.ocr =
                await this.runOCR(
                    document,
                    options
                );
        }

        if (
            this.validator?.validate
        ) {
            this.validator.validate(
                document,
                options
            );
        }

        if (
            this.documentService
                ?.process
        ) {
            result =
                await this.documentService.process(
                    document,
                    {
                        ...options,
                        ...result
                    }
                );
        }

        return result;
    }

    async runOCR(
        document,
        options
    ) {
        if (
            typeof this.ocr ===
            "function"
        ) {
            return this.ocr(
                document,
                options
            );
        }

        if (
            this.ocr?.process
        ) {
            return this.ocr.process(
                document,
                options
            );
        }

        return null;
    }

    async getMatterDocuments(
        matter,
        options = {}
    ) {
        if (
            this.documentService
                ?.getMatterDocuments
        ) {
            return this.documentService.getMatterDocuments(
                matter.id,
                options
            );
        }

        if (
            this.documentRepository
                ?.findByMatterId
        ) {
            return this.documentRepository.findByMatterId(
                matter.id
            );
        }

        return Array.isArray(
            matter.documents
        )
            ? matter.documents
            : [];
    }

    async getOutstanding(
        matter,
        options = {}
    ) {
        const required =
            this.knowledgeEngine
                ?.getRequiredDocuments
                ? await this.knowledgeEngine.getRequiredDocuments(
                      matter,
                      options
                  )
                : [];

        const supplied =
            await this.getMatterDocuments(
                matter,
                options
            );

        return required.filter(
            (requiredDocument) =>
                !this.matches(
                    requiredDocument,
                    supplied
                )
        );
    }

    matches(
        required,
        supplied
    ) {
        const requiredType =
            required.type ||
            required.documentType;

        return supplied.some(
            (document) =>
                (
                    document.type ||
                    document.documentType
                ) === requiredType
        );
    }

    async save(
        document,
        options = {}
    ) {
        if (
            this.documentService?.create
        ) {
            return this.documentService.create(
                document,
                options
            );
        }

        if (
            this.documentRepository?.create
        ) {
            return this.documentRepository.create(
                document
            );
        }

        throw new Error(
            "Document service or repository is required"
        );
    }
}

export default DocumentEngine;
