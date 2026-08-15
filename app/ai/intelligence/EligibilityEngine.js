export default class EligibilityEngine {
    constructor({
        complianceEngine = null
    } = {}) {
        this.complianceEngine =
            complianceEngine;
    }

    async evaluate(
        matter,
        requirements = []
    ) {
        const compliance =
            await this.complianceEngine?.evaluate?.(
                matter,
                requirements
            );

        if (!compliance) {
            return {
                eligible: null,
                requiresHumanReview: true
            };
        }

        return {
            eligible:
                compliance.compliant,
            requirements:
                compliance.requirements,
            requiresHumanReview: false
        };
    }
}
