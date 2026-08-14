import Transaction from "./Transaction.js";

export default class TransactionManager {
    constructor(database) {
        this.database = database;
        this.currentTransaction =
            null;
    }

    begin() {
        if (this.currentTransaction) {
            throw new Error(
                "A transaction is already active"
            );
        }

        this.currentTransaction =
            new Transaction(
                this.database
            );

        this.currentTransaction.begin();

        return this.currentTransaction;
    }

    commit() {
        if (!this.currentTransaction) {
            throw new Error(
                "No active transaction"
            );
        }

        const transaction =
            this.currentTransaction;

        try {
            transaction.commit();
        } finally {
            this.currentTransaction =
                null;
        }
    }

    rollback() {
        if (!this.currentTransaction) {
            return;
        }

        try {
            this.currentTransaction.rollback();
        } finally {
            this.currentTransaction =
                null;
        }
    }

    async run(callback) {
        const transaction =
            this.begin();

        try {
            const result =
                await callback(
                    transaction
                );

            this.commit();

            return result;
        } catch (error) {
            this.rollback();
            throw error;
        }
    }

    isActive() {
        return Boolean(
            this.currentTransaction
        );
    }
}
