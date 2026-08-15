export default class AnalysisEngine {
    constructor({
        analyzers = {},
        confidenceEngine = null,
        audit = null
    } = {}) {
        this.analyzers = new Map(
            Object.entries(analyzers)
        );

        this.confidenceEngine =
            confidenceEngine;

        this.audit = audit;
    }

    register(name, analyzer) {
        this.analyzers.set(
            name,
            analyzer
        );
    }

    async analyze(
        type,
        input,
        context = {}
    ) {
        const analyzer =
            this.analyzers.get(type);

        if (!analyzer) {
            throw new Error(
                `AI analyzer not registered: ${type}`
            );
        }

        const result =
            await analyzer.analyze(
                input,
                context
            );

        const confidence =
            this.confidenceEngine?.calculate?.(
                result,
                context
            );

        const finalResult = {
            type,
            result,
            confidence,
            timestamp:
                new Date().toISOString()
        };

        await this.audit?.recordSuccess?.({
            action:
                "AI_ANALYSIS_COMPLETED",
            eventType: "AI",
            matterId:
                context.matterId || null,
            metadata: {
                type,
                confidence
            }
        });

        return finalResult;
    }
}
