export default class WorkflowRuntime {
    constructor({
        stepExecutor,
        checkpointManager
    }) {
        this.stepExecutor =
            stepExecutor;

        this.checkpointManager =
            checkpointManager;
    }

    async run(
        workflow,
        context
    ) {
        for (
            let index = 0;
            index <
            workflow.steps.length;
            index++
        ) {
            this.checkpointManager?.save(
                context.id,
                {
                    step: index,
                    context
                }
            );

            await this.stepExecutor.execute(
                workflow.steps[index],
                context
            );
        }

        return context;
    }
}
