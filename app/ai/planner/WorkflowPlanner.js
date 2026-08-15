export default class WorkflowPlanner {
    plan({
        workflow,
        state
    } = {}) {
        if (!workflow) {
            return {
                action:
                    "NO_WORKFLOW"
            };
        }

        return {
            workflow:
                workflow.id ||
                workflow.name,
            state,
            nextStep:
                workflow.steps?.find(
                    step =>
                        step.completed !==
                        true
                ) || null
        };
    }
}
