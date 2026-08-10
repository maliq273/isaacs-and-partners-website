/**
 * KnowledgeCache
 * ------------------------------------------------------------
 * In-memory cache for validated knowledge-base domains,
 * sources, indexes and derived knowledge structures.
 */

export class KnowledgeCache {
    constructor(options = {}) {
        this.ttl = options.ttl ?? 30 * 60 * 1000;
        this.maxEntries = options.maxEntries ?? 5000;
        this.cache = new Map();
    }

    set(key, value, options = {}) {
        if (!key) {
            throw new Error("KnowledgeCache key is required");
        }

        const ttl =
            options.ttl === undefined
                ? this.ttl
                : options.ttl;

        if (this.cache.size >= this.maxEntries) {
            this.evictOldest();
        }

        this.cache.set(key, {
            value,
            createdAt: Date.now(),
            expiresAt:
                ttl === null
                    ? null
                    : Date.now() + ttl
        });

        return value;
    }

    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        if (
            entry.expiresAt !== null &&
            Date.now() > entry.expiresAt
        ) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    keys() {
        return Array.from(this.cache.keys());
    }

    values() {
        return this.keys()
            .map((key) => this.get(key))
            .filter((value) => value !== null);
    }

    getOrSet(key, factory, options = {}) {
        const existing = this.get(key);

        if (existing !== null) {
            return existing;
        }

        const value = factory();

        return this.set(key, value, options);
    }

    evictOldest() {
        const firstKey = this.cache.keys().next().value;

        if (firstKey !== undefined) {
            this.cache.delete(firstKey);
        }
    }

    invalidateDomain(domainId) {
        if (!domainId) {
            return;
        }

        for (const key of this.cache.keys()) {
            if (
                key === domainId ||
                key.startsWith(`${domainId}:`)
            ) {
                this.cache.delete(key);
            }
        }
    }

    stats() {
        return {
            size: this.cache.size,
            maxEntries: this.maxEntries,
            ttl: this.ttl
        };
    }
}

export default KnowledgeCache;
