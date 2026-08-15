export default class RiskEngine {
    constructor({
        riskAnalysis,
        confidenceEngine
    } = {}) {
        this.riskAnalysis =
            riskAnalysis;

        this.confidenceEngine =
            confidenceEngine;
    }

    async assess(input = {}) {
        const result =
            await this.riskAnalysis.analyze(
                input
            );

        const confidence =
            this.confidenceEngine?.calculate?.(
                result
            ) ?? 0.5;

        return {
            ...result,
            confidence,
            requiresHumanReview:
                confidence < 0.75 ||
                result.riskLevel ===
                    "HIGH"
        };
    }
}
