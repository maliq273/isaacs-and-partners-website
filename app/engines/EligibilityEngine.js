/**
 * EligibilityEngine
 * ------------------------------------------------------------
 * Determines eligibility from configured knowledge/rules.
 *
 * IMPORTANT:
 * This engine does not create legal advice independently.
 * It consumes the application's approved knowledgebase and
 * rules.
 */

export class EligibilityEngine {
    constructor({
        knowledgeEngine = null,
        ruleEngine = null,
        documentEngine = null,
        logger = console
    } = {}) {
        this.knowledgeEngine =
            knowledgeEngine;
        this.ruleEngine =
            ruleEngine;
        this.documentEngine =
            documentEngine;
        this.logger = logger;
    }

    async check(
        subject,
        options = {}
    ) {
        if (!subject) {
            throw new Error(
                "Eligibility subject is required"
            );
        }

        const criteria =
            await this.getCriteria(
                subject,
                options
            );

        const result = {
            eligible: true,
            criteria,
            passed: [],
            failed: [],
            outstanding: [],
            evaluatedAt:
                new Date().toISOString()
        };

        for (
            const criterion of criteria
        ) {
            const evaluation =
                await this.evaluateCriterion(
                    criterion,
                    subject,
                    options
                );

            if (
                evaluation.passed
            ) {
                result.passed.push(
                    evaluation
                );
            } else {
                result.failed.push(
                    evaluation
                );
            }

            if (
                evaluation.outstanding
            ) {
                result.outstanding.push(
                    evaluation
                );
            }
        }

        result.eligible =
            result.failed.length ===
                0 &&
            result.outstanding.length ===
                0;

        return result;
    }

    async getCriteria(
        subject,
        options
    ) {
        if (
            this.knowledgeEngine
                ?.getEligibilityCriteria
        ) {
            return (
                await this.knowledgeEngine.getEligibilityCriteria(
                    subject,
                    options
                )
            ) || [];
        }

        return [];
    }

    async evaluateCriterion(
        criterion,
        subject,
        options
    ) {
        if (
            this.ruleEngine?.evaluate
        ) {
            return this.ruleEngine.evaluate(
                criterion,
                subject,
                options
            );
        }

        return {
            criterion,
            passed: true,
            outstanding: false
        };
    }
}

export default EligibilityEngine;
