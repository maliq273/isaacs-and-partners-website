/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * consultation.service.js
 * ============================================================
 *
 * LOCATION
 * app/services/consultation.service.js
 *
 * PURPOSE
 * Consultation application service.
 * ============================================================
 */

export default class ConsultationService {

    constructor({
        clientService = null,
        matterService = null,
        bookingService = null,
        aiService = null,
        knowledgeService = null,
        logger = null
    } = {}) {

        this.clientService =
            clientService;

        this.matterService =
            matterService;

        this.bookingService =
            bookingService;

        this.aiService =
            aiService;

        this.knowledgeService =
            knowledgeService;

        this.logger =
            logger;
    }

    async startConsultation({
        clientId = null,
        matterId = null,
        answers = {},
        metadata = {}
    } = {}) {

        if (!clientId) {
            throw new Error(
                "Client ID is required."
            );
        }

        return {
            id:
                `CONSULT-${Date.now()}`,

            clientId,

            matterId,

            answers,

            metadata,

            status:
                "IN_PROGRESS",

            startedAt:
                new Date()
        };
    }

    async analyseConsultation(
        consultation
    ) {

        if (
            this.aiService &&
            typeof this.aiService.execute ===
            "function"
        ) {

            return this.aiService.execute(
                "consultation-analysis",
                {
                    consultation
                }
            );
        }

        return {
            status:
                "PENDING"
        };
    }

    async generateRecommendations(
        consultation
    ) {

        if (
            this.aiService &&
            typeof this.aiService
                .getRecommendation ===
            "function"
        ) {

            return this.aiService
                .getRecommendation({
                    consultation
                });
        }

        return [];
    }

    async completeConsultation(
        consultation
    ) {

        return {
            ...consultation,

            status:
                "COMPLETED",

            completedAt:
                new Date()
        };
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Free consultation
     * Paid consultation
     * Consultation wizard
     * Question engine
     * Eligibility analysis
     * Matter creation
     * Appointment creation
     * Consultation summary
     * Retainer conversion
     * ========================================================
     */

}
