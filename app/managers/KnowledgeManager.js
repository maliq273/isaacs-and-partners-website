/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Knowledge Manager
 * ============================================================
 */

export default class KnowledgeManager {

    constructor({
        repository = null,
        knowledgeService = null,
        loader = null,
        logger = null
    } = {}) {

        this.repository = repository;
        this.knowledgeService =
            knowledgeService;
        this.loader = loader;
        this.logger = logger;

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Knowledge version control
        // Source verification
        // Effective dates
        // Legal authority tracking
        // ====================================================
    }


    async getById(
        id
    ) {

        if (
            this.knowledgeService &&
            typeof this.knowledgeService.getById ===
            "function"
        ) {

            return this.knowledgeService.getById(
                id
            );

        }

        if (
            this.repository &&
            typeof this.repository.findById ===
            "function"
        ) {

            return this.repository.findById(
                id
            );

        }

        return null;

    }


    async search(
        query,
        filters = {}
    ) {

        if (
            this.knowledgeService &&
            typeof this.knowledgeService.search ===
            "function"
        ) {

            return this.knowledgeService.search(
                query,
                filters
            );

        }

        if (
            this.repository &&
            typeof this.repository.search ===
            "function"
        ) {

            return this.repository.search(
                query,
                filters
            );

        }

        return [];

    }


    async getDocumentsForMatter(
        matter
    ) {

        if (
            this.knowledgeService &&
            typeof this.knowledgeService.getRequiredDocuments ===
            "function"
        ) {

            return this.knowledgeService
                .getRequiredDocuments(
                    matter
                );

        }

        return [];

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Immigration knowledgebase
    // Visa types
    // DHA requirements
    // VFS requirements
    // SAQA requirements
    // CCMA rules
    // Labour legislation
    // SARS requirements
    // ========================================================

}
