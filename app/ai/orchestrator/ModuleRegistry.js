export default class ModuleRegistry {
    constructor() {
        this.modules = new Map();
    }

    register(name, module) {
        if (!name || !module) {
            throw new Error(
                "Module name and module are required"
            );
        }

        this.modules.set(name, module);
        return module;
    }

    get(name) {
        return this.modules.get(name);
    }

    has(name) {
        return this.modules.has(name);
    }

    remove(name) {
        return this.modules.delete(name);
    }

    list() {
        return [
            ...this.modules.keys()
        ];
    }

    clear() {
        this.modules.clear();
    }
}
