/**
 * AIEngine
 * ------------------------------------------------------------
 * Central orchestration engine for AI operations.
 *
 * Connects to the existing:
 * - AIService
 * - AIManager
 * - KnowledgeEngine
 * - DocumentEngine
 * - RiskEngine
 * - MatterEngine
 *
 * The engine orchestrates. It does not duplicate domain rules.
 */

export class AIEngine {
    constructor({
        aiService = null,
        aiManager = null,
        knowledgeEngine = null,
        documentEngine = null,
        riskEngine = null,
        matterEngine = null,
        eventDispatcher = null,
        logger = console
    } = {}) {
        this.aiService = aiService;
        this.aiManager = aiManager;
        this.knowledgeEngine =
            knowledgeEngine;
        this.documentEngine =
            documentEngine;
        this.riskEngine = riskEngine;
        this.matterEngine =
            matterEngine;
        this.eventDispatcher =
            eventDispatcher;
        this.logger = logger;
    }

    async analyseMatter(
        matter,
        options = {}
    ) {
        this.assertMatter(matter);

        const context =
            await this.buildMatterContext(
                matter,
                options
            );

        await this.emit(
            "ai.analysis.started",
            {
                type: "matter",
                matterId:
                    matter.id
            }
        );

        try {
            const result =
                await this.executeAI(
                    "analyseMatter",
                    context,
                    options
                );

            await this.emit(
                "ai.analysis.completed",
                {
                    type: "matter",
                    matterId:
                        matter.id,
                    result
                }
            );

            return result;
        } catch (error) {
            await this.emit(
                "ai.analysis.failed",
                {
                    type: "matter",
                    matterId:
                        matter.id,
                    error
                }
            );

            throw error;
        }
    }

    async analyseDocument(
        document,
        options = {}
    ) {
        if (!document) {
            throw new Error(
                "Document is required"
            );
        }

        const context = {
            document,
            matter:
                options.matter ||
                null
        };

        if (
            this.documentEngine &&
            typeof this.documentEngine.analyse ===
                "function"
        ) {
            context.documentAnalysis =
                await this.documentEngine.analyse(
                    document,
                    options
                );
        }

        return this.executeAI(
            "analyseDocument",
            context,
            options
        );
    }

    async generateRecommendation(
        context,
        options = {}
    ) {
        return this.executeAI(
            "generateRecommendation",
            context,
            options
        );
    }

    async assessRisk(
        context,
        options = {}
    ) {
        if (
            this.riskEngine &&
            typeof this.riskEngine.assess ===
                "function"
        ) {
            return this.riskEngine.assess(
                context,
                options
            );
        }

        return this.executeAI(
            "assessRisk",
            context,
            options
        );
    }

    async buildMatterContext(
        matter,
        options = {}
    ) {
        const context = {
            matter
        };

        if (
            this.matterEngine &&
            typeof this.matterEngine.getContext ===
                "function"
        ) {
            context.matterContext =
                await this.matterEngine.getContext(
                    matter,
                    options
                );
        }

        if (
            this.knowledgeEngine &&
            typeof this.knowledgeEngine.search ===
                "function"
        ) {
            context.knowledge =
                await this.knowledgeEngine.search(
                    {
                        matter,
                        query:
                            options.query ||
                            matter.type ||
                            matter.matterType
                    },
                    options
                );
        }

        if (
            this.riskEngine &&
            options.includeRisk !==
                false &&
            typeof this.riskEngine.assess ===
                "function"
        ) {
            context.risk =
                await this.riskEngine.assess(
                    matter,
                    options
                );
        }

        return context;
    }

    async executeAI(
        operation,
        context,
        options = {}
    ) {
        if (
            this.aiManager &&
            typeof this.aiManager[
                operation
            ] === "function"
        ) {
            return this.aiManager[
                operation
            ](
                context,
                options
            );
        }

        if (
            this.aiService &&
            typeof this.aiService[
                operation
            ] === "function"
        ) {
            return this.aiService[
                operation
            ](
                context,
                options
            );
        }

        if (
            this.aiService &&
            typeof this.aiService.execute ===
                "function"
        ) {
            return this.aiService.execute(
                operation,
                context,
                options
            );
        }

        throw new Error(
            `No AI provider supports operation: ${operation}`
        );
    }

    async emit(
        event,
        payload
    ) {
        if (
            this.eventDispatcher &&
            typeof this.eventDispatcher.emit ===
                "function"
        ) {
            return this.eventDispatcher.emit(
                event,
                payload
            );
        }

        return null;
    }

    assertMatter(matter) {
        if (!matter) {
            throw new Error(
                "Matter is required"
            );
        }
    }
}

export default AIEngine;
