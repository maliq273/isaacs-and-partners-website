export default class AIOrchestrator {
    constructor({
        registry,
        pipeline = null,
        audit = null
    } = {}) {
        this.registry = registry;
        this.pipeline = pipeline;
        this.audit = audit;
    }

    async execute(context) {
        const started =
            Date.now();

        try {
            if (this.pipeline) {
                await this.pipeline.execute(
                    context
                );
            }

            context.complete();

            await this.audit?.recordSuccess?.({
                action: "AI_EXECUTION_COMPLETED",
                eventType: "AI",
                matterId:
                    context.matter?.id ||
                    null,
                metadata: {
                    executionId: context.id,
                    duration:
                        Date.now() - started
                }
            });

            return context;
        } catch (error) {
            context.addError(error);

            await this.audit?.recordFailure?.({
                action: "AI_EXECUTION_FAILED",
                eventType: "AI",
                matterId:
                    context.matter?.id ||
                    null,
                metadata: {
                    executionId: context.id,
                    error: error.message
                }
            });

            throw error;
        }
    }
}
