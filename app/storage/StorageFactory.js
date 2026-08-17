/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * StorageFactory
 * ------------------------------------------------------------
 * Central storage provider factory.
 *
 * Responsibilities:
 * - Create storage providers
 * - Select providers by explicit configuration
 * - Select safe defaults by environment
 * - Create database instances
 * - Create initialised database instances
 * - Prevent unsafe production fallbacks
 *
 * IMPORTANT:
 * - Never place Supabase service-role keys in frontend code.
 * - Supabase client configuration must use the public
 *   publishable/anon key only.
 * ============================================================
 */

import MemoryAdapter
    from "./MemoryAdapter.js";

import LocalStorageAdapter
    from "./LocalStorageAdapter.js";

import SessionStorageAdapter
    from "./SessionStorageAdapter.js";

import IndexedDBAdapter
    from "./IndexedDBAdapter.js";

import SQLiteAdapter
    from "./SQLiteAdapter.js";

import SupabaseAdapter
    from "./SupabaseAdapter.js";

import Database
    from "./Database.js";


class StorageFactory {

    /**
     * ========================================================
     * CREATE
     * ========================================================
     *
     * Create a storage provider.
     *
     * Supported:
     *
     * memory
     * local
     * localstorage
     * session
     * sessionstorage
     * indexeddb
     * sqlite
     * supabase
     *
     * @param {string} type
     * @param {Object} options
     * @returns {Object}
     */
    static create(
        type = "auto",
        options = {}
    ) {

        const resolvedType =
            this.resolveType(
                type,
                options
            );

        switch (resolvedType) {

            case "memory":

                return new MemoryAdapter(
                    options
                );


            case "local":

            case "localstorage":

                return new LocalStorageAdapter(
                    options
                );


            case "session":

            case "sessionstorage":

                return new SessionStorageAdapter(
                    options
                );


            case "indexeddb":

                return new IndexedDBAdapter(
                    options
                );


            case "sqlite":

                return new SQLiteAdapter(
                    options
                );


            case "supabase":

                return new SupabaseAdapter(
                    options
                );


            default:

                throw new Error(
                    `Unsupported storage provider: ${resolvedType}`
                );

        }

    }


    /**
     * ========================================================
     * CREATE DATABASE
     * ========================================================
     *
     * Creates the database abstraction using the selected
     * storage provider.
     */
    static createDatabase(
        type = "auto",
        options = {}
    ) {

        const provider =
            this.create(
                type,
                options
            );


        return new Database({

            ...options,

            provider

        });

    }


    /**
     * ========================================================
     * CREATE INITIALISED DATABASE
     * ========================================================
     */
    static async createInitializedDatabase(
        type = "auto",
        options = {}
    ) {

        const database =
            this.createDatabase(
                type,
                options
            );


        if (
            database &&
            typeof database.initialize ===
                "function"
        ) {

            await database.initialize();

        }

        else if (
            database &&
            typeof database.initialise ===
                "function"
        ) {

            await database.initialise();

        }


        return database;

    }


    /**
     * ========================================================
     * RESOLVE TYPE
     * ========================================================
     *
     * Resolves "auto" into an appropriate provider.
     *
     * Production:
     *     Supabase
     *
     * Development:
     *     IndexedDB
     *
     * Test:
     *     Memory
     *
     * Explicit provider selections are always respected.
     */
    static resolveType(
        type = "auto",
        options = {}
    ) {

        const requested =
            String(type || "auto")
                .trim()
                .toLowerCase();


        if (
            requested !== "auto"
        ) {

            this.validateProvider(
                requested,
                options
            );

            return requested;

        }


        const environment =
            this.detectEnvironment(
                options
            );


        if (
            environment === "test"
        ) {

            return "memory";

        }


        if (
            environment === "production"
        ) {

            return "supabase";

        }


        /*
         * Development is deliberately local-first.
         *
         * IndexedDB is preferable to localStorage for
         * application data because it supports structured
         * records and larger datasets.
         */
        return "indexeddb";

    }


    /**
     * ========================================================
     * DETECT ENVIRONMENT
     * ========================================================
     */
    static detectEnvironment(
        options = {}
    ) {

        if (
            options.environment
        ) {

            return String(
                options.environment
            ).toLowerCase();

        }


        if (
            typeof process !== "undefined" &&
            process.env &&
            process.env.NODE_ENV
        ) {

            const nodeEnvironment =
                String(
                    process.env.NODE_ENV
                ).toLowerCase();


            if (
                nodeEnvironment === "test"
            ) {

                return "test";

            }


            if (
                nodeEnvironment ===
                    "production"
            ) {

                return "production";

            }


            return "development";

        }


        if (
            typeof window !== "undefined"
        ) {

            const hostname =
                window.location.hostname;


            if (
                hostname ===
                    "localhost" ||
                hostname ===
                    "127.0.0.1"
            ) {

                return "development";

            }


            if (
                hostname.includes(
                    "github.io"
                )
            ) {

                return "production";

            }


            return "production";

        }


        return "development";

    }


    /**
     * ========================================================
     * VALIDATE PROVIDER
     * ========================================================
     */
    static validateProvider(
        type,
        options = {}
    ) {

        const supported =
            [
                "memory",
                "local",
                "localstorage",
                "session",
                "sessionstorage",
                "indexeddb",
                "sqlite",
                "supabase",
            ];


        if (
            !supported.includes(type)
        ) {

            throw new Error(
                `Unsupported storage provider: ${type}`
            );

        }


        /*
         * Production safety.
         *
         * Explicitly selecting an unsafe browser-only
         * provider in production should require an
         * explicit override.
         */
        const environment =
            this.detectEnvironment(
                options
            );


        const unsafeProductionProviders =
            [
                "memory",
                "local",
                "localstorage",
                "session",
                "sessionstorage",
            ];


        if (
            environment === "production" &&
            unsafeProductionProviders.includes(
                type
            ) &&
            options.allowUnsafeProductionStorage !==
                true
        ) {

            throw new Error(
                `Storage provider "${type}" is not permitted as a production provider. ` +
                `Use "supabase" or explicitly set ` +
                `allowUnsafeProductionStorage: true.`
            );

        }

    }


    /**
     * ========================================================
     * IS SUPABASE AVAILABLE
     * ========================================================
     */
    static isSupabaseConfigured(
        options = {}
    ) {

        return Boolean(
            options.supabaseUrl &&
            options.supabaseKey
        );

    }


    /**
     * ========================================================
     * GET DEFAULT PROVIDER
     * ========================================================
     */
    static getDefaultProvider(
        options = {}
    ) {

        return this.resolveType(
            "auto",
            options
        );

    }


    /**
     * ========================================================
     * PROVIDER INFORMATION
     * ========================================================
     */
    static getProviderInfo(
        type = "auto",
        options = {}
    ) {

        const resolvedType =
            this.resolveType(
                type,
                options
            );


        return {

            requested:
                type,

            resolved:
                resolvedType,

            environment:
                this.detectEnvironment(
                    options
                ),

            supabaseConfigured:
                this.isSupabaseConfigured(
                    options
                ),

        };

    }

}


export {
    StorageFactory
};


export default StorageFactory;
