/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * StorageFactory
 * ------------------------------------------------------------
 * Central storage provider factory.
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


export default class StorageFactory {

    static create(
        type = "local",
        options = {}
    ) {

        let provider;


        switch (
            type.toLowerCase()
        ) {

            case "memory":

                provider =
                    new MemoryAdapter(
                        options
                    );

                break;


            case "local":

            case "localstorage":

                provider =
                    new LocalStorageAdapter(
                        options
                    );

                break;


            case "session":

            case "sessionstorage":

                provider =
                    new SessionStorageAdapter(
                        options
                    );

                break;


            case "indexeddb":

                provider =
                    new IndexedDBAdapter(
                        options
                    );

                break;


            case "sqlite":

                provider =
                    new SQLiteAdapter(
                        options
                    );

                break;


            case "supabase":

                provider =
                    new SupabaseAdapter(
                        options
                    );

                break;


            default:

                throw new Error(
                    `Unsupported storage provider: ${type}`
                );

        }


        return provider;

    }


    static createDatabase(
        type = "local",
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


    static async createInitializedDatabase(
        type = "local",
        options = {}
    ) {

        const database =
            this.createDatabase(
                type,
                options
            );

        await database.initialize();

        return database;

    }


    // =========================================================
    // FUTURE INSERT
    //
    // Environment selection:
    //
    // Development → Memory / IndexedDB
    // Production  → SQLite / Supabase
    //
    // Tenant selection
    // Offline-first selection
    // Failover provider
    // =========================================================

}
