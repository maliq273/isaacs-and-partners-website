export default class KernelLoader {
    constructor({
        container,
        registry,
        moduleLoader
    }) {
        this.container = container;
        this.registry = registry;
        this.moduleLoader =
            moduleLoader;
    }

    async load(modules = []) {
        for (const definition of modules) {
            await this.moduleLoader.load(
                definition.name,
                definition.module,
                definition.options || {}
            );
        }

        return this.registry;
    }
}
