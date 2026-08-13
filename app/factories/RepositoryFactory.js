/**
 * RepositoryFactory
 * ------------------------------------------------------------
 * Central registry for repositories.
 *
 * Expected repositories include:
 * - BaseRepository
 * - BookingRepository
 * - ClientRepository
 * - DocumentRepository
 * - KnowledgeRepository
 * - MatterRepository
 */

export class RepositoryFactory {
    constructor({
        repositories = {},
        dependencies = {},
        logger = console
    } = {}) {
        this.repositories = {
            ...repositories
        };

        this.dependencies =
            dependencies;

        this.logger = logger;
    }

    register(name, Repository) {
        if (
            !name ||
            typeof Repository !==
                "function"
        ) {
            throw new TypeError(
                "Repository name and constructor are required"
            );
        }

        this.repositories[name] =
            Repository;

        return this;
    }

    create(name, options = {}) {
        const Repository =
            this.repositories[name];

        if (!Repository) {
            throw new Error(
                `Repository is not registered: ${name}`
            );
        }

        return new Repository({
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
            this.repositories[name]
        );
    }

    list() {
        return Object.keys(
            this.repositories
        );
    }
}

export default RepositoryFactory;

