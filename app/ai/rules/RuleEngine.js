export default class RuleEngine {
    constructor({
        registry,
        evaluator
    }) {
        this.registry = registry;
        this.evaluator = evaluator;
    }

    async evaluate(
        name,
        context
    ) {
        const rule =
            this.registry.get(name);

        if (!rule) {
            throw new Error(
                `AI rule not found: ${name}`
            );
        }

        return this.evaluator.evaluate(
            rule,
            context
        );
    }
}
