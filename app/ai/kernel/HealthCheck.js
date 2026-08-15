export default class HealthCheck {
    constructor(registry) {
        this.registry = registry;
    }

    async run() {
        const results = {};

        for (
            const name of this.registry.list()
        ) {
            const module =
                this.registry.get(name);

            try {
                results[name] =
                    typeof module.health ===
                    "function"
                        ? await module.health()
                        : {
                            healthy: true
                        };
            } catch (error) {
                results[name] = {
                    healthy: false,
                    error: error.message
                };
            }
        }

        return {
            healthy: Object.values(
                results
            ).every(
                result => result.healthy
            ),
            modules: results
        };
    }
}
