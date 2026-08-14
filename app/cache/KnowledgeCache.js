/**
 * KnowledgeCache
 *
 * Caches knowledgebase lookups, indexed documents,
 * rules and search results.
 *
 * Knowledgebase changes must invalidate affected entries.
 */

export default class KnowledgeCache {
    constructor({
        ttl = 30 * 60 * 1000,
        maxEntries = 1000,
    } = {}) {
        this.ttl = ttl;
        this.maxEntries = maxEntries;
        this.entries = new Map();
    }

    set(key, value, options = {}) {
        if (!key) {
            throw new Error("Knowledge cache key is required");
        }

        const ttl = options.ttl ?? this.ttl;

        this.entries.set(
            String(key),
            {
                value,
                createdAt: Date.now(),
                expiresAt:
                    ttl > 0
                        ? Date.now() + ttl
                        : null,
            }
        );

        this.enforceLimit();

        return value;
    }

    get(key) {
        const entry = this.entries.get(String(key));

        if (!entry) {
            return null;
        }

        if (this.isExpired(entry)) {
            this.entries.delete(String(key));
            return null;
        }

        return entry.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        return this.entries.delete(String(key));
    }

    invalidateKnowledge(key = null) {
        if (!key) {
            return this.clear();
        }

        return this.delete(key);
    }

    invalidateDomain(domain) {
        const prefix = `${domain}:`;

        for (const key of this.entries.keys()) {
            if (key.startsWith(prefix)) {
                this.entries.delete(key);
            }
        }
    }

    clear() {
        this.entries.clear();
    }

    cleanup() {
        for (const [key, entry] of this.entries.entries()) {
            if (this.isExpired(entry)) {
                this.entries.delete(key);
            }
        }
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

    size() {
        return this.entries.size;
    }
}
