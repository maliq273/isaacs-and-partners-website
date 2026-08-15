export default class ConfidenceEngine {
    calculate(result = {}) {
        if (
            typeof result.confidence ===
            "number"
        ) {
            return Math.max(
                0,
                Math.min(
                    1,
                    result.confidence
                )
            );
        }

        if (
            result.complete === true ||
            result.eligible === true ||
            result.compliant === true
        ) {
            return 0.8;
        }

        return 0.5;
    }

    requiresHumanReview(
        confidence,
        threshold = 0.75
    ) {
        return confidence < threshold;
    }
}
