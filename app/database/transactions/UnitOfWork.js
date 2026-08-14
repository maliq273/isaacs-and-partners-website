export default class UnitOfWork {
    constructor({
        transactionManager,
        repositories = {}
    } = {}) {
        if (!transactionManager) {
            throw new Error(
                "transactionManager is required"
            );
        }

        this.transactionManager =
            transactionManager;

        this.repositories =
            repositories;

        this.pendingOperations = [];
    }

    add(operation) {
        if (
            typeof operation !==
            "function"
        ) {
            throw new TypeError(
                "Unit of work operation must be a function"
            );
        }

        this.pendingOperations.push(
            operation
        );

        return this;
    }

    async commit() {
        const operations = [
            ...this.pendingOperations
        ];

        this.pendingOperations = [];

        return this.transactionManager.run(
            async (transaction) => {
                const results = [];

                for (
                    const operation of
                    operations
                ) {
                    results.push(
                        await operation(
                            transaction,
                            this.repositories
                        )
                    );
                }

                return results;
            }
        );
    }

    clear() {
        this.pendingOperations = [];
    }

    get size() {
        return this.pendingOperations.length;
    }
}
