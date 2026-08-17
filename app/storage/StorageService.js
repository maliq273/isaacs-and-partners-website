/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * StorageService
 * ------------------------------------------------------------
 * Application-level storage service.
 *
 * Responsibilities:
 * - Select storage provider based on environment
 * - Own the active Database instance
 * - Provide a single storage API to the application
 * - Initialise storage
 * - Provide health checks
 * - Provide shutdown handling
 * ============================================================
 */

import StorageFactory
    from "./StorageFactory.js";

import environment
    from "../config/environment.js";


export default class StorageService {


    constructor(options = {}) {

        this.requestedType =
            options.type ??
            null;

        this.type =
            null;

        this.options =
            options;

        this.database =
            null;

        this.initialized =
            false;

    }


    /**
     * --------------------------------------------------------
     * DETERMINE STORAGE TYPE
     * --------------------------------------------------------
     *
     * Explicit provider selection always takes priority.
     *
     * Otherwise:
     *
     * Development:
     *     IndexedDB
     *
     * Production:
     *     Supabase
     *
     * This keeps browser development local while production
     * can use the central backend datastore.
     */

    resolveStorageType(
        requestedType = null
    ) {

        if (requestedType) {

            const normalised =
                StorageFactory.normaliseType(
                    requestedType
                );


            if (
                !StorageFactory.isSupported(
                    normalised
                )
            ) {

                throw new Error(
                    `Unsupported storage provider: ${requestedType}`
                );

            }


            return normalised;

        }


        if (
            environment.isDevelopment
        ) {

            /*
             * IndexedDB is preferred during development
             * because it provides persistent browser storage
             * without requiring the production backend.
             */

            return "indexeddb";

        }


        if (
            environment.isProduction
        ) {

            /*
             * Production should use the central datastore.
             */

            return "supabase";

        }


        /*
         * Defensive fallback.
         */

        return "memory";

    }


    /**
     * --------------------------------------------------------
     * INITIALISE
     * --------------------------------------------------------
     */

    async initialize(
        type = null,
        options = {}
    ) {

        if (this.initialized) {

            return this;

        }


        const selectedType =
            this.resolveStorageType(
                type ??
                this.requestedType
            );


        this.type =
            selectedType;


        this.options = {

            ...this.options,

            ...options

        };


        /*
         * Create and initialise the database.
         */

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


    getEnvironment() {

        return environment.name;

    }


    getDatabase() {

        this.assertInitialized();

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

            this.type =
                null;

            return true;

        }


        try {

            await this.database.close();

        } finally {

            this.database =
                null;

            this.initialized =
                false;

            this.type =
                null;

        }


        return true;

    }

}
