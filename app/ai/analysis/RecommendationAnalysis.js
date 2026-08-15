export default class RecommendationAnalysis {
    async analyze(input = {}) {
        return {
            type: "RECOMMENDATION",
            recommendations:
                input.recommendations ||
                [],
            requiresHumanReview:
                input.requiresHumanReview !==
                false
        };
    }
}
