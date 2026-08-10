/**
 * Isaacs & Partners
 * Frontend Storage Manager
 *
 * Provides a safe browser-storage abstraction.
 *
 * Priority:
 * 1. sessionStorage
 * 2. localStorage
 * 3. in-memory fallback
 *
 * Sensitive authentication data should preferably be
 * managed through secure server-side/session mechanisms.
 */

const memoryStore = new Map();

class StorageManager {
    constructor() {
        this.memory = memoryStore;
    }

    getStorage(type = "local") {
        try {
            if (type === "session") {
                return window.sessionStorage;
            }

            return window.localStorage;
        } catch {
            return null;
        }
    }

    set(key, value, options = {}) {
        const type =
            options.storage || "local";

        const storage =
            this.getStorage(type);

        const serialised =
            typeof value === "string"
                ? value
                : JSON.stringify(value);

        if (storage) {
            try {
                storage.setItem(
                    key,
                    serialised
                );

                return true;
            } catch {
                // Fall through to memory.
            }
        }

        this.memory.set(
            `${type}:${key}`,
            value
        );

        return true;
    }

    get(key, options = {}) {
        const type =
            options.storage || "local";

        const storage =
            this.getStorage(type);

        if (storage) {
            try {
                const value =
                    storage.getItem(key);

                if (value === null) {
                    return null;
                }

                if (
                    options.raw ||
                    typeof value !== "string"
                ) {
                    return value;
                }

                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            } catch {
                // Fall through.
            }
        }

        return (
            this.memory.get(
                `${type}:${key}`
            ) ?? null
        );
    }

    remove(key, options = {}) {
        const type =
            options.storage || "local";

        const storage =
            this.getStorage(type);

        if (storage) {
            try {
                storage.removeItem(key);
            } catch {
                // Ignore storage errors.
            }
        }

        return this.memory.delete(
            `${type}:${key}`
        );
    }

    has(key, options = {}) {
        return (
            this.get(key, options) !== null
        );
    }

    clear(options = {}) {
        const type =
            options.storage || "local";

        const storage =
            this.getStorage(type);

        if (storage) {
            try {
                storage.clear();
            } catch {
                // Ignore.
            }
        }

        for (const key of this.memory.keys()) {
            if (
                key.startsWith(`${type}:`)
            ) {
                this.memory.delete(key);
            }
        }
    }

    getJSON(key, options = {}) {
        return this.get(key, {
            ...options,
            raw: false
        });
    }

    setJSON(key, value, options = {}) {
        return this.set(
            key,
            value,
            options
        );
    }

    remember(
        key,
        value,
        ttl,
        options = {}
    ) {
        return this.set(
            key,
            {
                value,
                expiresAt:
                    Date.now() + ttl
            },
            options
        );
    }

    recall(key, options = {}) {
        const stored =
            this.get(key, options);

        if (
            !stored ||
            typeof stored !== "object" ||
            !stored.expiresAt
        ) {
            return stored;
        }

        if (
            Date.now() >
            stored.expiresAt
        ) {
            this.remove(
                key,
                options
            );

            return null;
        }

        return stored.value;
    }
}

export const storage =
    new StorageManager();

export {
    StorageManager
};

export default storage;
