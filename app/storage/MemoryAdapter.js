/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * MemoryAdapter
 * ------------------------------------------------------------
 * In-memory storage provider.
 * Useful for testing, temporary sessions and fallback storage.
 * ============================================================
 */

import StorageProvider from "./StorageProvider.js";

export default class MemoryAdapter
    extends StorageProvider {

    constructor(options = {}) {

        super({
            ...options,
            name: "MemoryAdapter"
        });

        this.store = new Map();

    }


    async initialize() {

        this.initialized = true;

        return this;

    }
async key(key) {
    return this.normaliseKey(key);
}

    async get(key) {

        this.assertInitialized();

        return this.store.has(key)
            ? this.store.get(key)
            : null;

    }


    async set(key, value) {

        this.assertInitialized();

        this.store.set(
            String(key),
            value
        );

        return value;

    }


    async delete(key) {

        this.assertInitialized();

        return this.store.delete(
            String(key)
        );

    }


    async has(key) {

        this.assertInitialized();

        return this.store.has(
            String(key)
        );

    }


    async clear() {

        this.assertInitialized();

        this.store.clear();

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


    // =========================================================
    // FUTURE INSERT
    // In-memory cache eviction
    // TTL support
    // LRU cache
    // =========================================================

}
