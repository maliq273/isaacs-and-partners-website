export default class IAIModule {
    constructor(name) {
        if (!name) {
            throw new Error("AI module name is required");
        }

        this.name = name;
        this.enabled = true;
    }

    async initialize() {
        return true;
    }

    async execute() {
        throw new Error(
            `${this.name} must implement execute()`
        );
    }

    async shutdown() {
        return true;
    }

    health() {
        return {
            name: this.name,
            enabled: this.enabled,
            healthy: true
        };
    }
}
