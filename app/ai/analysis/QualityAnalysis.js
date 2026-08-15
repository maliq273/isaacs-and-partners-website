export default class QualityAnalysis {
    async analyze(input = {}) {
        const issues = [];

        if (!input.document) {
            issues.push(
                "DOCUMENT_NOT_PROVIDED"
            );
        }

        if (
            input.document?.quality ===
            "LOW"
        ) {
            issues.push(
                "LOW_DOCUMENT_QUALITY"
            );
        }

        return {
            type: "QUALITY",
            passed:
                issues.length === 0,
            issues
        };
    }
}
