export default class ComplianceEngine {
    constructor({
        ruleEngine = null,
        knowledgeEngine = null
    } = {}) {
        this.ruleEngine = ruleEngine;
        this.knowledgeEngine =
            knowledgeEngine;
    }

    async evaluate(
        matter,
        requirements = []
    ) {
        const results = [];

        for (const requirement of requirements) {
            let satisfied =
                requirement.satisfied;

            if (
                satisfied === undefined &&
                this.ruleEngine?.evaluate
            ) {
                satisfied =
                    await this.ruleEngine.evaluate(
                        requirement.rule,
                        matter
                    );
            }

            results.push({
                ...requirement,
                satisfied:
                    Boolean(satisfied)
            });
        }

        return {
            compliant:
                results.every(
                    result =>
                        !result.required ||
                        result.satisfied
                ),
            requirements: results
        };
    }
}
