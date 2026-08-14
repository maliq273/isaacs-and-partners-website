export default class RollbackManager {
    constructor() {
        this.operations = [];
    }

    register(operation) {
        if (
            typeof operation !==
            "function"
        ) {
            throw new TypeError(
                "Rollback operation must be a function"
            );
        }

        this.operations.push(
            operation
        );

        return this;
    }

    async rollback() {
        const errors = [];

        for (
            let index =
                this.operations.length -
                1;
            index >= 0;
            index--
        ) {
            try {
                await this.operations[
                    index
                ]();
            } catch (error) {
                errors.push(error);
            }
        }

        this.operations = [];

        if (errors.length) {
            const error =
                new Error(
                    "One or more rollback operations failed"
                );

            error.causes = errors;

            throw error;
        }
    }

    clear() {
        this.operations = [];
    }

    size() {
        return this.operations.length;
    }
}
