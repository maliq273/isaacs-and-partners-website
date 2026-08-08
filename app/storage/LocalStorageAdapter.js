/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * LocalStorageAdapter
 * ============================================================
 */

import StorageProvider from "./StorageProvider.js";

export default class LocalStorageAdapter
    extends StorageProvider {

    constructor(options = {}) {

        super({
            ...options,
            name: "LocalStorageAdapter"
        });

        this.storage =
            options.storage ??
            globalThis.localStorage;

        this.prefix =
            options.prefix ??
            "isaacs:";

    }


    async initialize() {

        if (!this.storage) {

            throw new Error(
                "localStorage is unavailable."
            );

        }

        this.initialized = true;

        return this;

    }


    buildKey(key) {

        return `${this.prefix}${key}`;

    }


    async get(key) {

        this.assertInitialized();

        const value =
            this.storage.getItem(
                this.buildKey(key)
            );

        return this.deserialize(value);

    }


    async set(key, value) {

        this.assertInitialized();

        this.storage.setItem(
            this.buildKey(key),
            this.serialize(value)
        );

        return value;

    }


    async delete(key) {

        this.assertInitialized();

        const fullKey =
            this.buildKey(key);

        const exists =
            this.storage.getItem(fullKey) !== null;

        this.storage.removeItem(fullKey);

        return exists;

    }


    async has(key) {

        this.assertInitialized();

        return (
            this.storage.getItem(
                this.buildKey(key)
            ) !== null
        );

    }


    async clear() {

        this.assertInitialized();

        const keys = [];

        for (
            let index = 0;
            index < this.storage.length;
            index++
        ) {

            const key =
                this.storage.key(index);

            if (
                key &&
                key.startsWith(this.prefix)
            ) {

                keys.push(key);

            }

        }

        keys.forEach(key =>
            this.storage.removeItem(key)
        );

    }


    async keys() {

        this.assertInitialized();

        const result = [];

        for (
            let index = 0;
            index < this.storage.length;
            index++
        ) {

            const key =
                this.storage.key(index);

            if (
                key &&
                key.startsWith(this.prefix)
            ) {

                result.push(
                    key.substring(
                        this.prefix.length
                    )
                );

            }

        }

        return result;

    }


    // =========================================================
    // FUTURE INSERT
    // Storage quota monitoring
    // Automatic cleanup
    // Indexed encryption
    // =========================================================

}
