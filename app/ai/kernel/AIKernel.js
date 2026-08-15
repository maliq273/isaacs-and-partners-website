export default class AIKernel {
    constructor({
        container,
        registry,
        healthCheck
    }) {
        this.container = container;
        this.registry = registry;
        this.healthCheck =
            healthCheck;

        this.started = false;
    }

    async start() {
        if (this.started) {
            return this;
        }

        for (
            const name of this.registry.list()
        ) {
            await this.registry
                .get(name)
                ?.initialize?.();
        }

        this.started = true;

        return this;
    }

    async stop() {
        for (
            const name of this.registry.list()
        ) {
            await this.registry
                .get(name)
                ?.shutdown?.();
        }

        this.started = false;
    }

    async health() {
        return this.healthCheck.run();
    }
}
