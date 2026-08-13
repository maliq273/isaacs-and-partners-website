/**
 * AIFactory
 * ------------------------------------------------------------
 * Creates and configures the AI application layer.
 *
 * Expected integrations:
 * - AIManager
 * - AIService
 * - KnowledgeEngine
 * - DocumentEngine
 * - Risk/analysis engines
 *
 * Dependencies are injected so the factory does not duplicate
 * business logic or create hidden global state.
 */

export class AIFactory {
    constructor({
        AIManager = null,
        AIService = null,
        dependencies = {},
        logger = console
    } = {}) {
        this.AIManager = AIManager;
        this.AIService = AIService;
        this.dependencies = dependencies;
        this.logger = logger;
    }

    createManager(options = {}) {
        if (!this.AIManager) {
            throw new Error(
                "AIFactory requires AIManager"
            );
        }

        return new this.AIManager({
            ...this.dependencies,
            ...options
        });
    }

    createService(options = {}) {
        if (!this.AIService) {
            throw new Error(
                "AIFactory requires AIService"
            );
        }

        return new this.AIService({
            ...this.dependencies,
            ...options
        });
    }

    create(options = {}) {
        const service =
            options.service ||
            this.createService(
                options.serviceOptions
            );

        const manager =
            options.manager ||
            this.createManager({
                ...options.managerOptions,
                aiService: service
            });

        return {
            service,
            manager
        };
    }
}

export default AIFactory;
