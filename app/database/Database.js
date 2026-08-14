/**
 * Central database facade.
 *
 * The actual storage implementation remains behind the existing
 * storage adapters. This class deliberately exposes only the
 * operations required by the application database layer.
 */

export default class Database {
    constructor(adapter) {
        if (!adapter) {
            throw new Error(
                "Database adapter is required"
            );
        }

        this.adapter = adapter;
    }

    execute(sql, parameters = {}) {
        if (
            typeof this.adapter.execute !==
            "function"
        ) {
            throw new Error(
                "Database adapter does not implement execute()"
            );
        }

        return this.adapter.execute(
            sql,
            parameters
        );
    }

    query(sql, parameters = {}) {
        if (
            typeof this.adapter.query !==
            "function"
        ) {
            throw new Error(
                "Database adapter does not implement query()"
            );
        }

        return this.adapter.query(
            sql,
            parameters
        );
    }

    transaction(callback) {
        if (
            typeof this.adapter.transaction ===
            "function"
        ) {
            return this.adapter.transaction(
                callback
            );
        }

        throw new Error(
            "Database adapter does not support transactions"
        );
    }

    close() {
        if (
            typeof this.adapter.close ===
            "function"
        ) {
            return this.adapter.close();
        }

        return undefined;
    }
}
