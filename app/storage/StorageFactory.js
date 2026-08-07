/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ============================================================
 *
 * FILE
 * StorageFactory.js
 *
 * FILE ID
 * STO-002
 *
 * LOCATION
 * app/storage/StorageFactory.js
 *
 * RESPONSIBILITY
 * Creates storage adapters based on application configuration.
 *
 * USED BY
 * bootstrap.js
 * application.js
 * BaseRepository
 *
 * DEPENDS ON
 * StorageProvider
 *
 * VERSION
 * 1.0.0
 *
 * ============================================================
 * FUTURE EXPANSION MAP
 * ============================================================
 *
 * ✔ Adapter Resolution
 * ✔ Provider Creation
 * ✔ Configuration Validation
 *
 * □ Plugin Registration
 * □ Dynamic Discovery
 * □ Multi-Tenant Storage
 * □ Read Replicas
 * □ Cloud Failover
 * □ Metrics
 * □ Health Monitoring
 * ============================================================
 */

import StorageProvider from "./StorageProvider.js";

// Future adapters
import SQLiteAdapter from "./SQLiteAdapter.js";
import SupabaseAdapter from "./SupabaseAdapter.js";
import MemoryAdapter from "./MemoryAdapter.js";
import IndexedDBAdapter from "./IndexedDBAdapter.js";
import LocalStorageAdapter from "./LocalStorageAdapter.js";
import SessionStorageAdapter from "./SessionStorageAdapter.js";

export default class StorageFactory {

    /*=====================================================
        STO-002
        Factory Entry Point
    =====================================================*/

    static create(config = {}) {

        const provider = new StorageProvider();

        provider.register(

            this.createAdapter(config)

        );

        return provider;

    }

    /*=====================================================
        STO-003
        Adapter Resolution
    =====================================================*/

    static createAdapter(config = {}) {

        const type = (

            config.storage ||

            "memory"

        ).toLowerCase();

        switch (type) {

            case "sqlite":

                return new SQLiteAdapter(config);

            case "supabase":

                return new SupabaseAdapter(config);

            case "indexeddb":

                return new IndexedDBAdapter(config);

            case "localstorage":

                return new LocalStorageAdapter(config);

            case "sessionstorage":

                return new SessionStorageAdapter(config);

            case "memory":

            default:

                return new MemoryAdapter(config);

        }

    }

    /*=====================================================
        STO-004
        Supported Providers
    =====================================================*/

    static supportedProviders() {

        return [

            "sqlite",

            "supabase",

            "indexeddb",

            "localstorage",

            "sessionstorage",

            "memory"

        ];

    }

    /*=====================================================
        STO-005
        Validation
    =====================================================*/

    static isSupported(type) {

        return this.supportedProviders()

            .includes(

                String(type)

                .toLowerCase()

            );

    }

    /*=====================================================
        STO-006
        Provider Information
    =====================================================*/

    static info() {

        return {

            factory: "StorageFactory",

            providers: this.supportedProviders(),

            version: "1.0.0"

        };

    }

    /*=====================================================
        STO-007
        Plugin Registration
        Reserved
    =====================================================*/

    static registerAdapter() {

        // Reserved

    }

    /*=====================================================
        STO-008
        Dynamic Discovery
        Reserved
    =====================================================*/

    static discoverAdapters() {

        // Reserved

    }

    /*=====================================================
        STO-009
        Health Monitoring
        Reserved
    =====================================================*/

    static healthCheck() {

        return {

            healthy: true,

            adapters: this.supportedProviders(),

            timestamp: new Date()

        };

    }

    /*=====================================================
        STO-010
        Future Expansion
        Reserved
    =====================================================*/

    static metrics() {}

    static diagnostics() {}

    static benchmark() {}

}
