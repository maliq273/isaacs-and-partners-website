export default class RuleRegistry {
    constructor() {
        this.rules = new Map();
    }

    register(name, rule) {
        this.rules.set(name, rule);
    }

    get(name) {
        return this.rules.get(name);
    }

    has(name) {
        return this.rules.has(name);
    }

    list() {
        return [...this.rules.keys()];
    }
}
