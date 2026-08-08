/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * StorageProvider
 * ------------------------------------------------------------
 * Base contract for every storage adapter.
 * ============================================================
 */

export default class StorageProvider {

    constructor(options = {}) {

        this.name = options.name ?? "StorageProvider";

        this.initialized = false;

        this.options = options;

        // =====================================================
        // FUTURE INSERT
        // Storage telemetry configuration
        // Encryption configuration
        // Tenant isolation configuration
        // =====================================================

    }


    async initialize() {

        this.initialized = true;

        return this;

    }


    async close() {

        this.initialized = false;

    }


    assertInitialized() {

        if (!this.initialized) {

            throw new Error(
                `${this.name} has not been initialized.`
            );

        }

    }


    async get() {

        throw new Error(
            `${this.name}.get() must be implemented.`
        );

    }


    async set() {

        throw new Error(
            `${this.name}.set() must be implemented.`
        );

    }


    async delete() {

        throw new Error(
            `${this.name}.delete() must be implemented.`
        );

    }


    async has() {

        throw new Error(
            `${this.name}.has() must be implemented.`
        );

    }


    async clear() {

        throw new Error(
            `${this.name}.clear() must be implemented.`
        );

    }


    async keys() {

        throw new Error(
            `${this.name}.keys() must be implemented.`
        );

    }


    async values() {

        const keys = await this.keys();

        const values = [];

        for (const key of keys) {

            values.push(
                await this.get(key)
            );

        }

        return values;

    }


    async entries() {

        const keys = await this.keys();

        const entries = [];

        for (const key of keys) {

            entries.push([
                key,
                await this.get(key)
            ]);

        }

        return entries;

    }


    async transaction(callback) {

        const transaction = {

            get: key => this.get(key),

            set: (key, value) =>
                this.set(key, value),

            delete: key =>
                this.delete(key),

            has: key =>
                this.has(key)

        };

        return callback(transaction);

    }


    async healthCheck() {

        try {

            const key =
                `__storage_health_${Date.now()}`;

            await this.set(
                key,
                true
            );

            const result =
                await this.get(key);

            await this.delete(key);

            return result === true;

        } catch {

            return false;

        }

    }


    serialize(value) {

        return JSON.stringify(value);

    }


    deserialize(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return null;

        }

        if (
            typeof value !== "string"
        ) {

            return value;

        }

        try {

            return JSON.parse(value);

        } catch {

            return value;

        }

    }

}
