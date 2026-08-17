/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * StorageService
 * ------------------------------------------------------------
 * Application-level storage service.
 *
 * Responsibilities:
 * - Own the active Database instance
 * - Provide a single storage API to the application
 * - Initialise storage
 * - Provide health checks
 * - Provide shutdown handling
 * - Prevent direct provider management throughout the app
 * ============================================================
 */

import StorageFactory
    from "./StorageFactory.js";


export default class StorageService {


    constructor(options = {}) {

        this.type =
            options.type ??
            "local";

        this.options =
            options;

        this.database =
            null;

        this.initialized =
            false;

    }


    /**
     * --------------------------------------------------------
     * INITIALISE
     * --------------------------------------------------------
     */

    async initialize(
        type = this.type,
        options = this.options
    ) {

        if (this.initialized) {

            return this;

        }


        if (
            !StorageFactory.isSupported(
                type
            )
        ) {

            throw new Error(
                `Unsupported storage provider: ${type}`
            );

        }


        this.type =
            StorageFactory.normaliseType(
                type
            );


        this.options =
            options;


        this.database =
            await StorageFactory
                .createInitializedDatabase(
                    this.type,
                    this.options
                );


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


    getType() {

        return this.type;

    }


    getDatabase() {

        if (!this.database) {

            throw new Error(
                "StorageService has not been initialized."
            );

        }

        return this.database;

    }


    /**
     * --------------------------------------------------------
     * VALIDATION
     * --------------------------------------------------------
     */

    assertInitialized() {

        if (
            !this.initialized ||
            !this.database
        ) {

            throw new Error(
                "StorageService has not been initialized."
            );

        }

    }


    /**
     * --------------------------------------------------------
     * BASIC STORAGE OPERATIONS
     * --------------------------------------------------------
     */

    async get(key) {

        this.assertInitialized();

        return this.database.get(
            key
        );

    }


    async set(
        key,
        value
    ) {

        this.assertInitialized();

        return this.database.set(
            key,
            value
        );

    }


    async delete(key) {

        this.assertInitialized();

        return this.database.delete(
            key
        );

    }


    async has(key) {

        this.assertInitialized();

        return this.database.has(
            key
        );

    }


    async keys() {

        this.assertInitialized();

        return this.database.keys();

    }


    async values() {

        this.assertInitialized();

        return this.database.values();

    }


    async entries() {

        this.assertInitialized();

        return this.database.entries();

    }


    async clear() {

        this.assertInitialized();

        return this.database.clear();

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

        return this.database.transaction(
            callback
        );

    }


    /**
     * --------------------------------------------------------
     * HEALTH CHECK
     * --------------------------------------------------------
     */

    async healthCheck() {

        if (
            !this.initialized ||
            !this.database
        ) {

            return false;

        }


        return this.database.healthCheck();

    }


    /**
     * --------------------------------------------------------
     * SHUTDOWN
     * --------------------------------------------------------
     */

    async close() {

        if (!this.database) {

            this.initialized =
                false;

            return true;

        }


        try {

            await this.database.close();

        } finally {

            this.database =
                null;

            this.initialized =
                false;

        }


        return true;

    }

}
