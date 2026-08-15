export default class DependencyContainer {
    constructor() {
        this.services = new Map();
        this.factories = new Map();
    }

    register(name, value) {
        this.services.set(name, value);
        return this;
    }

    registerFactory(name, factory) {
        this.factories.set(name, factory);
        return this;
    }

    resolve(name) {
        if (this.services.has(name)) {
            return this.services.get(name);
        }

        if (this.factories.has(name)) {
            const instance =
                this.factories
                    .get(name)(this);

            this.services.set(
                name,
                instance
            );

            return instance;
        }

        throw new Error(
            `AI dependency not registered: ${name}`
        );
    }

    has(name) {
        return (
            this.services.has(name) ||
            this.factories.has(name)
        );
    }
}
