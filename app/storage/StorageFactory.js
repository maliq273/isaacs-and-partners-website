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


    /**
     * --------------------------------------------------------
     * CREATE STORAGE PROVIDER
     * --------------------------------------------------------
     */

    static create(
        type = "local",
        options = {}
    ) {

        const providerType =
            String(type)
                .trim()
                .toLowerCase();


        let provider;


        switch (providerType) {


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


    /**
     * --------------------------------------------------------
     * CREATE DATABASE
     * --------------------------------------------------------
     */

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


    /**
     * --------------------------------------------------------
     * CREATE + INITIALISE DATABASE
     * --------------------------------------------------------
     */

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


    /**
     * --------------------------------------------------------
     * CHECK SUPPORTED PROVIDER
     * --------------------------------------------------------
     */

    static isSupported(
        type
    ) {

        if (
            type === null ||
            type === undefined
        ) {

            return false;

        }


        const providerType =
            String(type)
                .trim()
                .toLowerCase();


        return [
            "memory",
            "local",
            "localstorage",
            "session",
            "sessionstorage",
            "indexeddb",
            "sqlite",
            "supabase"
        ].includes(
            providerType
        );

    }


    /**
     * --------------------------------------------------------
     * NORMALISE PROVIDER NAME
     * --------------------------------------------------------
     */

    static normaliseType(
        type
    ) {

        const providerType =
            String(type)
                .trim()
                .toLowerCase();


        switch (
            providerType
        ) {

            case "localstorage":

                return "local";


            case "sessionstorage":

                return "session";


            default:

                return providerType;

        }

    }

}
