export default class NextActionPlanner {
    plan(context = {}) {
        const actions = [];

        if (
            context.missingDocuments
                ?.length
        ) {
            actions.push({
                type:
                    "REQUEST_DOCUMENTS",
                priority: "HIGH"
            });
        }

        if (
            context.requiresReview
        ) {
            actions.push({
                type:
                    "HUMAN_REVIEW",
                priority: "HIGH"
            });
        }

        if (
            !actions.length
        ) {
            actions.push({
                type:
                    "REVIEW_MATTER",
                priority: "NORMAL"
            });
        }

        return actions;
    }
}
