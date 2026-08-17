/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Database
 * ------------------------------------------------------------
 * Application-level database facade.
 * ============================================================
 */

export default class Database {

    constructor(options = {}) {

        this.provider =
            options.provider ?? null;

        this.name =
            options.name ??
            "IsaacsPartners";

        this.initialized =
            false;

    }


    /**
     * --------------------------------------------------------
     * PROVIDER
     * --------------------------------------------------------
     */

    setProvider(provider) {

        if (!provider) {

            throw new Error(
                "Database provider cannot be empty."
            );

        }

        this.provider =
            provider;

        return this;

    }


    getProvider() {

        return this.provider;

    }


    /**
     * --------------------------------------------------------
     * INITIALISATION
     * --------------------------------------------------------
     */

    async initialize() {

        if (this.initialized) {

            return this;

        }


        if (!this.provider) {

            throw new Error(
                "Database provider has not been configured."
            );

        }


        if (
            typeof this.provider.initialize !==
            "function"
        ) {

            throw new Error(
                "Database provider does not support initialization."
            );

        }


        await this.provider.initialize();

        this.initialized =
            true;

        return this;

    }


    /**
     * --------------------------------------------------------
     * STATE
     * --------------------------------------------------------
     */

    isInitialized() {

        return this.initialized;

    }


    assertInitialized() {

        if (!this.initialized) {

            throw new Error(
                "Database has not been initialized."
            );

        }

    }


    /**
     * --------------------------------------------------------
     * BASIC OPERATIONS
     * --------------------------------------------------------
     */

    async get(key) {

        this.assertInitialized();

        return this.provider.get(
            key
        );

    }


    async set(
        key,
        value
    ) {

        this.assertInitialized();

        return this.provider.set(
            key,
            value
        );

    }


    async delete(key) {

        this.assertInitialized();

        return this.provider.delete(
            key
        );

    }


    async has(key) {

        this.assertInitialized();

        return this.provider.has(
            key
        );

    }


    async keys() {

        this.assertInitialized();

        return this.provider.keys();

    }


    async values() {

        this.assertInitialized();

        return this.provider.values();

    }


    async entries() {

        this.assertInitialized();

        return this.provider.entries();

    }


    async clear() {

        this.assertInitialized();

        return this.provider.clear();

    }


    /**
     * --------------------------------------------------------
     * TRANSACTIONS
     * --------------------------------------------------------
     */

    async transaction(
        callback
    ) {

        this.assertInitialized();

        if (
            typeof callback !==
            "function"
        ) {

            throw new TypeError(
                "Database transaction callback must be a function."
            );

        }


        return this.provider.transaction(
            callback
        );

    }


    /**
     * --------------------------------------------------------
     * HEALTH
     * --------------------------------------------------------
     */

    async healthCheck() {

        if (
            !this.initialized ||
            !this.provider
        ) {

            return false;

        }


        if (
            typeof this.provider.healthCheck !==
            "function"
        ) {

            return false;

        }


        return this.provider.healthCheck();

    }


    /**
     * --------------------------------------------------------
     * SHUTDOWN
     * --------------------------------------------------------
     */

    async close() {

        if (!this.provider) {

            this.initialized =
                false;

            return true;

        }


        try {

            if (
                typeof this.provider.close ===
                "function"
            ) {

                await this.provider.close();

            }

        } finally {

            this.initialized =
                false;

        }


        return true;

    }

}
