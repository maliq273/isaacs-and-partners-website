/**
 * CacheManager
 *
 * Central cache coordinator.
 *
 * Responsibilities:
 * - Register and manage cache stores.
 * - Read/write/delete cached values.
 * - TTL enforcement.
 * - Namespace isolation.
 * - Cache invalidation.
 * - Prevent stale cache from becoming the source of truth.
 */

export default class CacheManager {
    constructor({
        defaultTTL = 5 * 60 * 1000,
        maxEntries = 1000,
        storage = null,
        logger = null,
    } = {}) {
        this.defaultTTL = defaultTTL;
        this.maxEntries = maxEntries;
        this.storage = storage;
        this.logger = logger;

        this.caches = new Map();
        this.entries = new Map();
    }

    register(name, cache) {
        if (!name) {
            throw new Error("Cache name is required");
        }

        if (!cache) {
            throw new Error(`Cache instance is required for ${name}`);
        }

        this.caches.set(name, cache);

        return cache;
    }

    getCache(name) {
        return this.caches.get(name) || null;
    }

    async get(namespace, key) {
        const cache = this.getCache(namespace);

        if (cache && typeof cache.get === "function") {
            return cache.get(key);
        }

        const entryKey = this.buildKey(namespace, key);
        const entry = this.entries.get(entryKey);

        if (!entry) {
            return null;
        }

        if (this.isExpired(entry)) {
            this.entries.delete(entryKey);
            return null;
        }

        return entry.value;
    }

    async set(
        namespace,
        key,
        value,
        options = {}
    ) {
        const cache = this.getCache(namespace);

        if (cache && typeof cache.set === "function") {
            return cache.set(key, value, options);
        }

        const ttl =
            options.ttl ??
            this.defaultTTL;

        const entryKey = this.buildKey(namespace, key);

        this.entries.set(entryKey, {
            namespace,
            key,
            value,
            createdAt: Date.now(),
            expiresAt:
                ttl > 0
                    ? Date.now() + ttl
                    : null,
        });

        this.enforceLimit();

        return value;
    }

    async has(namespace, key) {
        const value = await this.get(namespace, key);

        return value !== null &&
            value !== undefined;
    }

    async delete(namespace, key) {
        const cache = this.getCache(namespace);

        if (cache && typeof cache.delete === "function") {
            return cache.delete(key);
        }

        return this.entries.delete(
            this.buildKey(namespace, key)
        );
    }

    async clear(namespace = null) {
        if (namespace) {
            const cache = this.getCache(namespace);

            if (cache && typeof cache.clear === "function") {
                return cache.clear();
            }

            for (const key of this.entries.keys()) {
                if (key.startsWith(`${namespace}:`)) {
                    this.entries.delete(key);
                }
            }

            return true;
        }

        for (const cache of this.caches.values()) {
            if (typeof cache.clear === "function") {
                await cache.clear();
            }
        }

        this.entries.clear();

        return true;
    }

    invalidate(namespace, predicate = null) {
        const cache = this.getCache(namespace);

        if (
            cache &&
            typeof cache.invalidate === "function"
        ) {
            return cache.invalidate(predicate);
        }

        const prefix = `${namespace}:`;

        for (const [key, entry] of this.entries.entries()) {
            if (!key.startsWith(prefix)) {
                continue;
            }

            if (
                !predicate ||
                predicate(entry.value, entry.key)
            ) {
                this.entries.delete(key);
            }
        }

        return true;
    }

    invalidateMatter(matterId) {
        for (const cache of this.caches.values()) {
            if (
                typeof cache.invalidateMatter === "function"
            ) {
                cache.invalidateMatter(matterId);
            }
        }
    }

    invalidateDocument(documentId) {
        for (const cache of this.caches.values()) {
            if (
                typeof cache.invalidateDocument === "function"
            ) {
                cache.invalidateDocument(documentId);
            }
        }
    }

    invalidateKnowledge(key = null) {
        const cache = this.getCache("knowledge");

        if (
            cache &&
            typeof cache.invalidateKnowledge === "function"
        ) {
            return cache.invalidateKnowledge(key);
        }

        return this.invalidate(
            "knowledge",
            key
                ? (_, entryKey) => entryKey === key
                : null
        );
    }

    buildKey(namespace, key) {
        return `${namespace}:${String(key)}`;
    }

    isExpired(entry) {
        return (
            entry.expiresAt !== null &&
            Date.now() >= entry.expiresAt
        );
    }

    enforceLimit() {
        while (this.entries.size > this.maxEntries) {
            const oldest = this.entries.keys().next().value;

            if (oldest === undefined) {
                break;
            }

            this.entries.delete(oldest);
        }
    }

    cleanup() {
        for (const [key, entry] of this.entries.entries()) {
            if (this.isExpired(entry)) {
                this.entries.delete(key);
            }
        }
    }

    stats() {
        return {
            registeredCaches: this.caches.size,
            entries: this.entries.size,
            maxEntries: this.maxEntries,
            defaultTTL: this.defaultTTL,
        };
    }
}
