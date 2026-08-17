/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * MemoryAdapter
 * ------------------------------------------------------------
 * In-memory storage provider.
 * Useful for testing, temporary sessions and fallback storage.
 * ============================================================
 */

import StorageProvider
    from "./StorageProvider.js";


export default class MemoryAdapter
    extends StorageProvider {


    constructor(options = {}) {

        super({
            ...options,
            name: "MemoryAdapter"
        });

        this.store =
            new Map();

    }


    async initialize() {

        this.initialized =
            true;

        return this;

    }


    async get(key) {

        this.assertInitialized();

        const normalisedKey =
            String(key);

        return this.store.has(
            normalisedKey
        )
            ? this.store.get(
                normalisedKey
            )
            : null;

    }


    async set(key, value) {

        this.assertInitialized();

        const normalisedKey =
            String(key);

        this.store.set(
            normalisedKey,
            value
        );

        return value;

    }


    async delete(key) {

        this.assertInitialized();

        const normalisedKey =
            String(key);

        return this.store.delete(
            normalisedKey
        );

    }


    async has(key) {

        this.assertInitialized();

        const normalisedKey =
            String(key);

        return this.store.has(
            normalisedKey
        );

    }


    async clear() {

        this.assertInitialized();

        this.store.clear();

        return true;

    }


    async keys() {

        this.assertInitialized();

        return Array.from(
            this.store.keys()
        );

    }


    async size() {

        this.assertInitialized();

        return this.store.size;

    }


    async close() {

        this.store.clear();

        this.initialized =
            false;

    }

}
