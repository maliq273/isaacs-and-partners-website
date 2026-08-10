/**
 * AIJob
 * ------------------------------------------------------------
 * Executes asynchronous AI analysis tasks.
 *
 * Designed to integrate with:
 * - AIManager
 * - AIService
 * - MatterManager
 * - KnowledgeEngine
 * - DocumentEngine
 *
 * The job does not contain AI business logic itself.
 * It orchestrates the execution and records the result.
 */

export class AIJob {
    constructor({
        aiManager = null,
        aiService = null,
        logger = console
    } = {}) {
        this.aiManager = aiManager;
        this.aiService = aiService;
        this.logger = logger;
        this.name = "AIJob";
    }

    async execute(payload = {}) {
        const startedAt = Date.now();

        try {
            const result =
                await this.runAnalysis(payload);

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
                duration:
                    Date.now() - startedAt,
                error: this.serialiseError(error)
            };
        }
    }

    async runAnalysis(payload) {
        if (
            this.aiManager &&
            typeof this.aiManager.analyse ===
                "function"
        ) {
            return this.aiManager.analyse(
                payload
            );
        }

        if (
            this.aiService &&
            typeof this.aiService.analyse ===
                "function"
        ) {
            return this.aiService.analyse(
                payload
            );
        }

        throw new Error(
            "AIJob requires AIManager or AIService"
        );
    }

    serialiseError(error) {
        return {
            name: error?.name || "Error",
            message:
                error?.message ||
                "Unknown AI job error",
            code: error?.code || null
        };
    }
}

export default AIJob;
