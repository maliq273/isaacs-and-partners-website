/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * IndexedDBAdapter
 * ============================================================
 */

import StorageProvider from "./StorageProvider.js";

export default class IndexedDBAdapter
    extends StorageProvider {

    constructor(options = {}) {

        super({
            ...options,
            name: "IndexedDBAdapter"
        });

        this.databaseName =
            options.databaseName ??
            "IsaacsPartners";

        this.storeName =
            options.storeName ??
            "application";

        this.version =
            options.version ??
            1;

        this.db = null;

    }


    async initialize() {

        if (!globalThis.indexedDB) {

            throw new Error(
                "IndexedDB is unavailable."
            );

        }

        this.db =
            await this.openDatabase();

        this.initialized = true;

        return this;

    }


    openDatabase() {

        return new Promise(
            (resolve, reject) => {

                const request =
                    indexedDB.open(
                        this.databaseName,
                        this.version
                    );

                request.onupgradeneeded =
                    event => {

                        const db =
                            event.target.result;

                        if (
                            !db.objectStoreNames
                                .contains(
                                    this.storeName
                                )
                        ) {

                            db.createObjectStore(
                                this.storeName
                            );

                        }

                        // =====================================
                        // FUTURE INSERT
                        // IndexedDB schema migrations
                        // =====================================

                    };


                request.onsuccess =
                    () => resolve(
                        request.result
                    );


                request.onerror =
                    () => reject(
                        request.error
                    );

            }
        );

    }


    transaction(mode = "readonly") {

        return this.db.transaction(
            this.storeName,
            mode
        ).objectStore(
            this.storeName
        );

    }


    async get(key) {

        this.assertInitialized();

        return new Promise(
            (resolve, reject) => {

                const request =
                    this.transaction()
                        .get(key);

                request.onsuccess =
                    () => resolve(
                        request.result ??
                        null
                    );

                request.onerror =
                    () => reject(
                        request.error
                    );

            }
        );

    }


    async set(key, value) {

        this.assertInitialized();

        return new Promise(
            (resolve, reject) => {

                const request =
                    this.transaction(
                        "readwrite"
                    ).put(
                        value,
                        key
                    );

                request.onsuccess =
                    () => resolve(value);

                request.onerror =
                    () => reject(
                        request.error
                    );

            }
        );

    }


    async delete(key) {

        this.assertInitialized();

        return new Promise(
            (resolve, reject) => {

                const request =
                    this.transaction(
                        "readwrite"
                    ).delete(key);

                request.onsuccess =
                    () => resolve(true);

                request.onerror =
                    () => reject(
                        request.error
                    );

            }
        );

    }


    async has(key) {

        const value =
            await this.get(key);

        return value !== null;

    }


    async clear() {

        this.assertInitialized();

        return new Promise(
            (resolve, reject) => {

                const request =
                    this.transaction(
                        "readwrite"
                    ).clear();

                request.onsuccess =
                    () => resolve();

                request.onerror =
                    () => reject(
                        request.error
                    );

            }
        );

    }


    async keys() {

        this.assertInitialized();

        return new Promise(
            (resolve, reject) => {

                const request =
                    this.transaction()
                        .getAllKeys();

                request.onsuccess =
                    () => resolve(
                        request.result
                    );

                request.onerror =
                    () => reject(
                        request.error
                    );

            }
        );

    }


    async close() {

        if (this.db) {

            this.db.close();

            this.db = null;

        }

        this.initialized = false;

    }


    // =========================================================
    // FUTURE INSERT
    // Object stores:
    // matters
    // clients
    // documents
    // appointments
    // communications
    // workflows
    // =========================================================

}
