/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * MatterService
 * ============================================================
 *
 * LOCATION
 * app/services/MatterService.js
 * ============================================================
 */

export default class MatterService {

    constructor({
        matterRepository = null,
        clientRepository = null,
        documentService = null,
        knowledgeService = null,
        aiService = null,
        logger = null
    } = {}) {

        this.matterRepository =
            matterRepository;

        this.clientRepository =
            clientRepository;

        this.documentService =
            documentService;

        this.knowledgeService =
            knowledgeService;

        this.aiService =
            aiService;

        this.logger =
            logger;
    }

    async createMatter(
        data = {}
    ) {

        if (!data.clientId) {
            throw new Error(
                "Client ID is required."
            );
        }

        if (!data.type) {
            throw new Error(
                "Matter type is required."
            );
        }

        if (
            this.matterRepository &&
            typeof this.matterRepository.create ===
            "function"
        ) {
            return this.matterRepository.create({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        return {
            id:
                `MATTER-${Date.now()}`,
            ...data
        };
    }

    async getMatter(
        matterId
    ) {

        if (
            this.matterRepository &&
            typeof this.matterRepository.findById ===
            "function"
        ) {
            return this.matterRepository.findById(
                matterId
            );
        }

        return null;
    }

    async getClientMatters(
        clientId
    ) {

        if (
            this.matterRepository &&
            typeof this.matterRepository.findByClientId ===
            "function"
        ) {
            return this.matterRepository
                .findByClientId(
                    clientId
                );
        }

        return [];
    }

    async updateMatter(
        matterId,
        updates = {}
    ) {

        if (
            this.matterRepository &&
            typeof this.matterRepository.update ===
            "function"
        ) {
            return this.matterRepository.update(
                matterId,
                {
                    ...updates,
                    updatedAt: new Date()
                }
            );
        }

        return {
            id: matterId,
            ...updates
        };
    }

    async analyseMatter(
        matter
    ) {

        if (
            this.aiService &&
            typeof this.aiService.analyseMatter ===
            "function"
        ) {
            return this.aiService.analyseMatter(
                matter
            );
        }

        return null;
    }

    async getRequiredDocuments(
        matter
    ) {

        if (
            this.documentService &&
            typeof this.documentService
                .getRequiredDocuments ===
            "function"
        ) {
            return this.documentService
                .getRequiredDocuments(
                    matter
                );
        }

        return [];
    }

    async changeStatus(
        matterId,
        status
    ) {

        return this.updateMatter(
            matterId,
            {
                status
            }
        );
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Matter lifecycle
     * AI analysis
     * Eligibility
     * Risk
     * Workflow generation
     * Document checklist
     * Matter timeline
     * Assignments
     * Escalations
     * Matter closure
     * ========================================================
     */

}
