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

        this.name =
            options.name ??
            "StorageProvider";

        this.initialized =
            false;

        this.options =
            options;

    }


    /**
     * --------------------------------------------------------
     * INITIALISATION
     * --------------------------------------------------------
     */

    async initialize() {

        this.initialized =
            true;

        return this;

    }


    /**
     * --------------------------------------------------------
     * SHUTDOWN
     * --------------------------------------------------------
     */

    async close() {

        this.initialized =
            false;

        return true;

    }


    /**
     * --------------------------------------------------------
     * STATE VALIDATION
     * --------------------------------------------------------
     */

    assertInitialized() {

        if (!this.initialized) {

            throw new Error(
                `${this.name} has not been initialized.`
            );

        }

    }


    /**
     * --------------------------------------------------------
     * REQUIRED STORAGE OPERATIONS
     * --------------------------------------------------------
     */

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


    /**
     * --------------------------------------------------------
     * DERIVED OPERATIONS
     * --------------------------------------------------------
     */

    async values() {

        this.assertInitialized();

        const keys =
            await this.keys();

        const values = [];

        for (
            const key of keys
        ) {

            values.push(
                await this.get(key)
            );

        }

        return values;

    }


    async entries() {

        this.assertInitialized();

        const keys =
            await this.keys();

        const entries = [];

        for (
            const key of keys
        ) {

            entries.push([
                key,
                await this.get(key)
            ]);

        }

        return entries;

    }


    /**
     * --------------------------------------------------------
     * TRANSACTION SUPPORT
     * --------------------------------------------------------
     *
     * Individual adapters may override this method when they
     * have native transaction support.
     *
     * The default implementation provides a controlled
     * transaction interface for simple providers.
     */

    async transaction(callback) {

        this.assertInitialized();

        if (
            typeof callback !==
            "function"
        ) {

            throw new TypeError(
                "Storage transaction callback must be a function."
            );

        }

        const transaction = {

            get: key =>
                this.get(key),

            set: (
                key,
                value
            ) =>
                this.set(
                    key,
                    value
                ),

            delete: key =>
                this.delete(key),

            has: key =>
                this.has(key)

        };


        return callback(
            transaction
        );

    }


    /**
     * --------------------------------------------------------
     * HEALTH CHECK
     * --------------------------------------------------------
     */

    async healthCheck() {

        if (!this.initialized) {

            return false;

        }

        const key =
            `__storage_health_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}`;

        try {

            await this.set(
                key,
                true
            );

            const result =
                await this.get(key);

            await this.delete(
                key
            );

            return result === true;

        } catch {

            try {

                await this.delete(
                    key
                );

            } catch {
                // Ignore cleanup failure.
            }

            return false;

        }

    }


    /**
     * --------------------------------------------------------
     * SERIALISATION
     * --------------------------------------------------------
     */

    serialize(value) {

        return JSON.stringify(
            value
        );

    }


    deserialize(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return null;

        }


        if (
            typeof value !==
            "string"
        ) {

            return value;

        }


        try {

            return JSON.parse(
                value
            );

        } catch {

            return value;

        }

    }

}
