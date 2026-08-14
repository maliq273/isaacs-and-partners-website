/**
 * RiskEngine
 * ------------------------------------------------------------
 * Central risk orchestration.
 *
 * Risk rules must come from configured application rules and
 * approved knowledge sources.
 */

export class RiskEngine {
    constructor({
        ruleEngine = null,
        knowledgeEngine = null,
        logger = console
    } = {}) {
        this.ruleEngine =
            ruleEngine;
        this.knowledgeEngine =
            knowledgeEngine;
        this.logger = logger;
    }

    async assess(
        subject,
        options = {}
    ) {
        if (!subject) {
            throw new Error(
                "Risk subject is required"
            );
        }

        const rules =
            await this.getRules(
                subject,
                options
            );

        const findings = [];

        for (
            const rule of rules
        ) {
            const result =
                await this.evaluate(
                    rule,
                    subject,
                    options
                );

            if (
                result &&
                (
                    result.risk ||
                    result.failed ||
                    result.triggered
                )
            ) {
                findings.push(
                    result
                );
            }
        }

        return {
            level:
                this.calculateLevel(
                    findings
                ),
            findings,
            assessedAt:
                new Date().toISOString()
        };
    }

    async getRules(
        subject,
        options
    ) {
        if (
            this.knowledgeEngine
                ?.getRiskRules
        ) {
            return (
                await this.knowledgeEngine.getRiskRules(
                    subject,
                    options
                )
            ) || [];
        }

        return [];
    }

    async evaluate(
        rule,
        subject,
        options
    ) {
        if (
            this.ruleEngine?.evaluate
        ) {
            return this.ruleEngine.evaluate(
                rule,
                subject,
                options
            );
        }

        return {
            rule,
            triggered: false,
            risk: false
        };
    }

    calculateLevel(
        findings
    ) {
        if (
            findings.some(
                (item) =>
                    item.level ===
                        "critical" ||
                    item.severity ===
                        "critical"
            )
        ) {
            return "critical";
        }

        if (
            findings.some(
                (item) =>
                    item.level ===
                        "high" ||
                    item.severity ===
                        "high"
            )
        ) {
            return "high";
        }

        if (
            findings.some(
                (item) =>
                    item.level ===
                        "medium" ||
                    item.severity ===
                        "medium"
            )
        ) {
            return "medium";
        }

        return findings.length
            ? "low"
            : "none";
    }
}

export default RiskEngine;
