export default class EligibilityAnalysis {
    async analyze(input = {}) {
        const requirements =
            input.requirements || [];

        const failed =
            requirements.filter(
                requirement =>
                    requirement.required &&
                    !requirement.satisfied
            );

        return {
            type: "ELIGIBILITY",
            eligible:
                failed.length === 0,
            failed,
            requiresHumanReview:
                Boolean(
                    input.requiresHumanReview
                )
        };
    }
}
