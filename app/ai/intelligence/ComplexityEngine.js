export default class ComplexityEngine {
    calculate(input = {}) {
        const factors = {
            documents:
                input.documents?.length ||
                0,
            issues:
                input.issues?.length ||
                0,
            parties:
                input.parties?.length ||
                0,
            risks:
                input.risks?.length ||
                0
        };

        const score =
            factors.documents +
            factors.issues * 2 +
            factors.parties +
            factors.risks * 3;

        return {
            score,
            level:
                score >= 15
                    ? "VERY_HIGH"
                    : score >= 10
                    ? "HIGH"
                    : score >= 5
                    ? "MEDIUM"
                    : "LOW",
            factors
        };
    }
}
