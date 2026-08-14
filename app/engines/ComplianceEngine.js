/**
 * ComplianceEngine
 * ------------------------------------------------------------
 * Coordinates compliance checks.
 *
 * This engine evaluates configured application rules and
 * knowledgebase requirements. It does not invent legal rules.
 */

export class ComplianceEngine {
    constructor({
        knowledgeEngine = null,
        documentEngine = null,
        eligibilityEngine = null,
        validator = null,
        riskEngine = null,
        logger = console
    } = {}) {
        this.knowledgeEngine =
            knowledgeEngine;
        this.documentEngine =
            documentEngine;
        this.eligibilityEngine =
            eligibilityEngine;
        this.validator = validator;
        this.riskEngine = riskEngine;
        this.logger = logger;
    }

    async assess(
        subject,
        options = {}
    ) {
        if (!subject) {
            throw new Error(
                "Compliance subject is required"
            );
        }

        const result = {
            compliant: true,
            checks: [],
            outstanding: [],
            risks: [],
            evaluatedAt:
                new Date().toISOString()
        };

        await this.checkValidation(
            subject,
            result,
            options
        );

        await this.checkDocuments(
            subject,
            result,
            options
        );

        await this.checkEligibility(
            subject,
            result,
            options
        );

        await this.checkRisk(
            subject,
            result,
            options
        );

        result.compliant =
            result.checks.every(
                (check) =>
                    check.passed !== false
            ) &&
            result.outstanding
                .length === 0;

        return result;
    }

    async checkValidation(
        subject,
        result,
        options
    ) {
        if (
            !this.validator?.validate
        ) {
            return;
        }

        try {
            await this.validator.validate(
                subject,
                options
            );

            result.checks.push({
                type: "validation",
                passed: true
            });
        } catch (error) {
            result.checks.push({
                type: "validation",
                passed: false,
                message:
                    error.message
            });
        }
    }

    async checkDocuments(
        subject,
        result,
        options
    ) {
        if (
            this.documentEngine
                ?.getOutstanding
        ) {
            const outstanding =
                await this.documentEngine.getOutstanding(
                    subject,
                    options
                );

            result.outstanding.push(
                ...(
                    outstanding || []
                )
            );
        }
    }

    async checkEligibility(
        subject,
        result,
        options
    ) {
        if (
            this.eligibilityEngine
                ?.check
        ) {
            const eligibility =
                await this.eligibilityEngine.check(
                    subject,
                    options
                );

            result.checks.push({
                type: "eligibility",
                passed:
                    eligibility?.eligible !==
                    false,
                result:
                    eligibility
            });
        }
    }

    async checkRisk(
        subject,
        result,
        options
    ) {
        if (
            this.riskEngine?.assess
        ) {
            const risk =
                await this.riskEngine.assess(
                    subject,
                    options
                );

            result.risks.push(
                risk
            );
        }
    }
}

export default ComplianceEngine;
