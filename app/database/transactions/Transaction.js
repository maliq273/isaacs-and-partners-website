export default class Transaction {
    constructor(database) {
        if (!database) {
            throw new Error(
                "Database connection is required"
            );
        }

        this.database = database;
        this.active = false;
        this.completed = false;
        this.rolledBack = false;
    }

    begin() {
        if (this.active) {
            throw new Error(
                "Transaction is already active"
            );
        }

        this.database.exec(
            "BEGIN TRANSACTION"
        );

        this.active = true;
        this.completed = false;
        this.rolledBack = false;

        return this;
    }

    commit() {
        if (!this.active) {
            throw new Error(
                "No active transaction"
            );
        }

        this.database.exec(
            "COMMIT"
        );

        this.active = false;
        this.completed = true;

        return this;
    }

    rollback() {
        if (!this.active) {
            return this;
        }

        this.database.exec(
            "ROLLBACK"
        );

        this.active = false;
        this.completed = true;
        this.rolledBack = true;

        return this;
    }

    execute(callback) {
        if (
            typeof callback !==
            "function"
        ) {
            throw new TypeError(
                "Transaction callback must be a function"
            );
        }

        this.begin();

        try {
            const result =
                callback(this.database);

            this.commit();

            return result;
        } catch (error) {
            this.rollback();
            throw error;
        }
    }
}
