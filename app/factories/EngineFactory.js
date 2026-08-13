/**
 * EngineFactory
 * ------------------------------------------------------------
 * Creates application engines.
 *
 * Designed for:
 * - KnowledgeEngine
 * - RequirementEngine
 * - RuleEngine
 * - DocumentEngine
 * - SearchEngine
 * - AI engines
 */

export class EngineFactory {
    constructor({
        engines = {},
        dependencies = {},
        logger = console
    } = {}) {
        this.engines = {
            ...engines
        };

        this.dependencies =
            dependencies;

        this.logger = logger;
    }

    register(name, Engine) {
        if (
            !name ||
            typeof Engine !==
                "function"
        ) {
            throw new TypeError(
                "Engine name and constructor are required"
            );
        }

        this.engines[name] =
            Engine;

        return this;
    }

    create(name, options = {}) {
        const Engine =
            this.engines[name];

        if (!Engine) {
            throw new Error(
                `Engine is not registered: ${name}`
            );
        }

        return new Engine({
            ...this.dependencies,
            ...options
        });
    }

    createMany(
        names = [],
        options = {}
    ) {
        return names.reduce(
            (result, name) => {
                result[name] =
                    this.create(
                        name,
                        options[name] ||
                            {}
                    );

                return result;
            },
            {}
        );
    }

    has(name) {
        return Boolean(
            this.engines[name]
        );
    }

    list() {
        return Object.keys(
            this.engines
        );
    }
}

export default EngineFactory;
