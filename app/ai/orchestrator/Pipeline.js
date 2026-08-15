export default class Pipeline {
    constructor(stages = []) {
        this.stages = [...stages];
    }

    use(stage) {
        if (!stage) {
            throw new Error(
                "Pipeline stage is required"
            );
        }

        this.stages.push(stage);
        return this;
    }

    async execute(context) {
        for (const stage of this.stages) {
            if (
                typeof stage === "function"
            ) {
                await stage(context);
                continue;
            }

            if (
                typeof stage.execute ===
                "function"
            ) {
                await stage.execute(context);
            }
        }

        return context;
    }
}
