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

        this.initialized = false;

        // =====================================================
        // FUTURE INSERT
        // Domain repositories
        // Unit of Work
        // Database health monitoring
        // =====================================================

    }


    setProvider(provider) {

        this.provider = provider;

        return this;

    }


    async initialize() {

        if (!this.provider) {

            throw new Error(
                "Database provider has not been configured."
            );

        }

        await this.provider.initialize();

        this.initialized = true;

        return this;

    }


    assertInitialized() {

        if (!this.initialized) {

            throw new Error(
                "Database has not been initialized."
            );

        }

    }


    async get(key) {

        this.assertInitialized();

        return this.provider.get(key);

    }


    async set(key, value) {

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


    async clear() {

        this.assertInitialized();

        return this.provider.clear();

    }


    async transaction(callback) {

        this.assertInitialized();

        return this.provider.transaction(
            callback
        );

    }


    async healthCheck() {

        if (!this.initialized) {

            return false;

        }

        return this.provider.healthCheck();

    }


    async close() {

        if (
            this.provider &&
            typeof this.provider.close ===
            "function"
        ) {

            await this.provider.close();

        }

        this.initialized = false;

    }


    // =========================================================
    // FUTURE INSERT
    //
    // Repository registration:
    //
    // ClientRepository
    // MatterRepository
    // DocumentRepository
    // BookingRepository
    // KnowledgeRepository
    //
    // =========================================================

}
