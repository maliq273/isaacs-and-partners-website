/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SQLiteAdapter
 * ============================================================
 */

import StorageProvider
    from "./StorageProvider.js";

export default class SQLiteAdapter
    extends StorageProvider {

    constructor(options = {}) {

        super({
            ...options,
            name: "SQLiteAdapter"
        });

        this.db =
            options.db ?? null;

        this.tableName =
            options.tableName ??
            "application_storage";
    }


    validateIdentifier(value) {

        if (
            !/^[A-Za-z_][A-Za-z0-9_]*$/.test(
                value
            )
        ) {

            throw new Error(
                `Unsafe SQLite identifier: ${value}`
            );

        }

        return value;

    }


    async initialize() {

        if (!this.db) {

            throw new Error(
                "SQLiteAdapter requires an injected SQLite database instance."
            );

        }

        this.validateIdentifier(
            this.tableName
        );

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS
            ${this.tableName} (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT
            )
        `);

        this.initialized = true;

        return this;

    }


    async get(key) {

        this.assertInitialized();

        const result =
            await this.db.get(
                `
                SELECT value
                FROM ${this.tableName}
                WHERE key = ?
                LIMIT 1
                `,
                [
                    this.normaliseKey(key)
                ]
            );

        return result
            ? this.deserialize(
                result.value
            )
            : null;

    }


    async set(key, value) {

        this.assertInitialized();

        await this.db.exec(
            `
            INSERT INTO ${this.tableName}
                (key, value)
            VALUES (?, ?)

            ON CONFLICT(key)
            DO UPDATE SET
                value = excluded.value
            `,
            [
                this.normaliseKey(key),
                this.serialize(value)
            ]
        );

        return value;

    }


    async delete(key) {

        this.assertInitialized();

        await this.db.exec(
            `
            DELETE FROM ${this.tableName}
            WHERE key = ?
            `,
            [
                this.normaliseKey(key)
            ]
        );

        return true;

    }


    async has(key) {

        this.assertInitialized();

        const result =
            await this.db.get(
                `
                SELECT 1 AS present
                FROM ${this.tableName}
                WHERE key = ?
                LIMIT 1
                `,
                [
                    this.normaliseKey(key)
                ]
            );

        return Boolean(result);

    }


    async clear() {

        this.assertInitialized();

        await this.db.exec(
            `
            DELETE FROM ${this.tableName}
            `
        );

    }


    async keys() {

        this.assertInitialized();

        const rows =
            await this.db.all(
                `
                SELECT key
                FROM ${this.tableName}
                ORDER BY key
                `
            );

        return (
            rows ?? []
        ).map(
            row => row.key
        );

    }


    async healthCheck() {

        if (!this.initialized) {
            return false;
        }

        try {

            await this.db.get(
                "SELECT 1 AS ok"
            );

            return true;

        } catch {

            return false;

        }

    }


    async close() {

        if (
            this.db &&
            typeof this.db.close ===
                "function"
        ) {

            await this.db.close();

        }

        this.db = null;

        this.initialized = false;

    }

}
