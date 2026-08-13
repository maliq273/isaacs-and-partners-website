/**
 * BuilderFactory
 * ------------------------------------------------------------
 * Central factory for constructing configured builders.
 *
 * A builder may be:
 * - pipeline builder
 * - query builder
 * - workflow builder
 * - document/bundle builder
 */

export class BuilderFactory {
    constructor({
        builders = {},
        logger = console
    } = {}) {
        this.builders = {
            ...builders
        };

        this.logger = logger;
    }

    register(name, Builder) {
        if (
            !name ||
            typeof Builder !==
                "function"
        ) {
            throw new TypeError(
                "Builder name and constructor are required"
            );
        }

        this.builders[name] =
            Builder;

        return this;
    }

    create(name, options = {}) {
        const Builder =
            this.builders[name];

        if (!Builder) {
            throw new Error(
                `Builder is not registered: ${name}`
            );
        }

        return new Builder(
            options
        );
    }

    has(name) {
        return Boolean(
            this.builders[name]
        );
    }

    list() {
        return Object.keys(
            this.builders
        );
    }
}

export default BuilderFactory;
