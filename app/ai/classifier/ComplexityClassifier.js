export default class ComplexityClassifier {
    classify(input = {}) {
        const documentCount =
            input.documentCount ||
            input.documents?.length ||
            0;

        const issueCount =
            input.issueCount || 0;

        const riskCount =
            input.riskCount || 0;

        const score =
            documentCount +
            issueCount * 2 +
            riskCount * 3;

        let value = "LOW";

        if (score >= 10) {
            value = "HIGH";
        } else if (score >= 5) {
            value = "MEDIUM";
        }

        return {
            value,
            score,
            confidence: 0.8
        };
    }
}
