export default class ModuleLoader {
    constructor(registry) {
        this.registry = registry;
    }

    async load(
        name,
        ModuleClass,
        options = {}
    ) {
        const module =
            new ModuleClass(options);

        await module.initialize?.();

        this.registry.register(
            name,
            module
        );

        return module;
    }
}
