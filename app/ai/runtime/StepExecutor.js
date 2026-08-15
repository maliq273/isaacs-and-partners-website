export default class StepExecutor {
    async execute(
        step,
        context
    ) {
        if (
            typeof step ===
            "function"
        ) {
            return step(context);
        }

        if (
            typeof step.execute ===
            "function"
        ) {
            return step.execute(
                context
            );
        }

        throw new Error(
            "Invalid workflow step"
        );
    }
}
