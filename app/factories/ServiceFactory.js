/**
 * ServiceFactory
 * ------------------------------------------------------------
 * Central registry for application services.
 *
 * This keeps service construction consistent and prevents
 * different parts of the application from creating services
 * with different dependencies.
 */

export class ServiceFactory {
    constructor({
        services = {},
        dependencies = {},
        logger = console
    } = {}) {
        this.services = {
            ...services
        };

        this.dependencies =
            dependencies;

        this.logger = logger;
    }

    register(name, Service) {
        if (
            !name ||
            typeof Service !==
                "function"
        ) {
            throw new TypeError(
                "Service name and constructor are required"
            );
        }

        this.services[name] =
            Service;

        return this;
    }

    create(name, options = {}) {
        const Service =
            this.services[name];

        if (!Service) {
            throw new Error(
                `Service is not registered: ${name}`
            );
        }

        return new Service({
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
            this.services[name]
        );
    }

    list() {
        return Object.keys(
            this.services
        );
    }
}

export default ServiceFactory;
