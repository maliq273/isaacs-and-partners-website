/**
 * Isaacs and Partners
 * Core Storage Facade
 *
 * The application uses this facade instead of directly
 * accessing localStorage/sessionStorage.
 *
 * Persistent storage:
 *     localStorage
 *
 * Session storage:
 *     sessionStorage
 *
 * The distinction is important for Remember Me.
 */

class CoreStorage {
    constructor() {
        this.provider = null;
        this.initialised = false;
    }

    configure(provider) {
        if (!provider) {
            throw new TypeError(
                "Storage provider is required."
            );
        }

        if (
            typeof provider !== "object" &&
            typeof provider !== "function"
        ) {
            throw new TypeError(
                "Storage provider must be an object."
            );
        }

        this.provider = provider;
        this.initialised = false;

        return this;
    }

    async initialise() {
        if (this.initialised) {
            return this;
        }

        if (!this.provider) {
            this.provider =
                this._createDefaultProvider();
        }

        if (
            typeof this.provider.initialise ===
            "function"
        ) {
            await this.provider.initialise();
        } else if (
            typeof this.provider.init ===
            "function"
        ) {
            await this.provider.init();
        }

        this.initialised = true;

        return this;
    }

    async init() {
        return this.initialise();
    }

    async get(
        key,
        defaultValue = null
    ) {
        this._assertProvider();

        if (
            typeof this.provider.get !==
            "function"
        ) {
            throw new Error(
                "Storage provider does not implement get()."
            );
        }

        const value =
            await this.provider.get(key);

        return (
            value === undefined ||
            value === null
        )
            ? defaultValue
            : value;
    }

    async set(key, value) {
        this._assertProvider();

        if (
            typeof this.provider.set !==
            "function"
        ) {
            throw new Error(
                "Storage provider does not implement set()."
            );
        }

        return this.provider.set(
            key,
            value
        );
    }

    async remove(key) {
        this._assertProvider();

        if (
            typeof this.provider.remove ===
            "function"
        ) {
            return this.provider.remove(key);
        }

        if (
            typeof this.provider.delete ===
            "function"
        ) {
            return this.provider.delete(key);
        }

        throw new Error(
            "Storage provider does not implement remove() or delete()."
        );
    }

    async delete(key) {
        return this.remove(key);
    }

    async has(key) {
        this._assertProvider();

        if (
            typeof this.provider.has ===
            "function"
        ) {
            return Boolean(
                await this.provider.has(key)
            );
        }

        const missing =
            Symbol.for("storage.missing");

        const value =
            await this.get(
                key,
                missing
            );

        return value !== missing;
    }

    async clear() {
        this._assertProvider();

        if (
            typeof this.provider.clear !==
            "function"
        ) {
            throw new Error(
                "Storage provider does not implement clear()."
            );
        }

        return this.provider.clear();
    }

    async getSession(
        key,
        defaultValue = null
    ) {
        this._assertProvider();

        if (
            typeof this.provider.getSession !==
            "function"
        ) {
            throw new Error(
                "Storage provider does not implement getSession()."
            );
        }

        const value =
            await this.provider.getSession(key);

        return (
            value === undefined ||
            value === null
        )
            ? defaultValue
            : value;
    }

    async setSession(key, value) {
        this._assertProvider();

        if (
            typeof this.provider.setSession !==
            "function"
        ) {
            throw new Error(
                "Storage provider does not implement setSession()."
            );
        }

        return this.provider.setSession(
            key,
            value
        );
    }

    async removeSession(key) {
        this._assertProvider();

        if (
            typeof this.provider.removeSession !==
            "function"
        ) {
            throw new Error(
                "Storage provider does not implement removeSession()."
            );
        }

        return this.provider.removeSession(key);
    }

    async hasSession(key) {
        this._assertProvider();

        if (
            typeof this.provider.hasSession ===
            "function"
        ) {
            return Boolean(
                await this.provider.hasSession(key)
            );
        }

        const missing =
            Symbol.for("storage.session.missing");

        const value =
            await this.getSession(
                key,
                missing
            );

        return value !== missing;
    }

    getProvider() {
        return this.provider;
    }

    getStatus() {
        return {
            configured:
                Boolean(this.provider),

            initialised:
                this.initialised,

            provider:
                this.provider?.constructor?.name ||
                null
        };
    }

    reset() {
        this.initialised = false;

        return this;
    }

    _assertProvider() {
        if (!this.provider) {
            throw new Error(
                "Storage provider has not been configured."
            );
        }
    }

    _createDefaultProvider() {
        if (
            typeof window ===
            "undefined"
        ) {
            return new MemoryStorageProvider();
        }

        return new BrowserStorageProvider();
    }
}


/**
 * Browser storage provider.
 */
class BrowserStorageProvider {
    async initialise() {
        return this;
    }

    async init() {
        return this.initialise();
    }

    async get(key) {
        const raw =
            window.localStorage.getItem(key);

        if (raw === null) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }

    async set(key, value) {
        window.localStorage.setItem(
            key,
            JSON.stringify(value)
        );

        return value;
    }

    async remove(key) {
        window.localStorage.removeItem(key);
    }

    async delete(key) {
        return this.remove(key);
    }

    async has(key) {
        return (
            window.localStorage.getItem(key) !==
            null
        );
    }

    async clear() {
        window.localStorage.clear();
    }

    async getSession(key) {
        const raw =
            window.sessionStorage.getItem(key);

        if (raw === null) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }

    async setSession(key, value) {
        window.sessionStorage.setItem(
            key,
            JSON.stringify(value)
        );

        return value;
    }

    async removeSession(key) {
        window.sessionStorage.removeItem(key);
    }

    async hasSession(key) {
        return (
            window.sessionStorage.getItem(key) !==
            null
        );
    }
}


/**
 * Memory provider for non-browser execution.
 */
class MemoryStorageProvider {
    constructor() {
        this.values = new Map();
        this.sessionValues = new Map();
    }

    async initialise() {
        return this;
    }

    async init() {
        return this.initialise();
    }

    async get(key) {
        return (
            this.values.get(key) ??
            null
        );
    }

    async set(key, value) {
        this.values.set(
            key,
            value
        );

        return value;
    }

    async remove(key) {
        this.values.delete(key);
    }

    async delete(key) {
        return this.remove(key);
    }

    async has(key) {
        return this.values.has(key);
    }

    async clear() {
        this.values.clear();
        this.sessionValues.clear();
    }

    async getSession(key) {
        return (
            this.sessionValues.get(key) ??
            null
        );
    }

    async setSession(key, value) {
        this.sessionValues.set(
            key,
            value
        );

        return value;
    }

    async removeSession(key) {
        this.sessionValues.delete(key);
    }

    async hasSession(key) {
        return this.sessionValues.has(key);
    }
}


export const storage =
    new CoreStorage();

export {
    CoreStorage,
    BrowserStorageProvider,
    MemoryStorageProvider
};

export default storage;
