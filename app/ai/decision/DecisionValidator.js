export default class DecisionValidator {
    validate(decision) {
        const errors = [];

        if (!decision) {
            errors.push(
                "DECISION_REQUIRED"
            );
        }

        if (
            decision &&
            !decision.result &&
            !decision.requiresHumanReview
        ) {
            errors.push(
                "DECISION_RESULT_REQUIRED"
            );
        }

        return {
            valid:
                errors.length === 0,
            errors
        };
    }
}
