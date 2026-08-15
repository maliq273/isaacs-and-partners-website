export default class RiskAnalysis {
    async analyze(input = {}) {
        const risks = [];

        if (input.expiredDocument) {
            risks.push({
                code: "EXPIRED_DOCUMENT",
                severity: "HIGH"
            });
        }

        if (input.missingDocument) {
            risks.push({
                code: "MISSING_DOCUMENT",
                severity: "MEDIUM"
            });
        }

        if (input.conflictingInformation) {
            risks.push({
                code:
                    "CONFLICTING_INFORMATION",
                severity: "HIGH"
            });
        }

        return {
            type: "RISK",
            risks,
            riskLevel:
                risks.some(
                    risk =>
                        risk.severity ===
                        "HIGH"
                )
                    ? "HIGH"
                    : risks.length
                    ? "MEDIUM"
                    : "LOW"
        };
    }
}
