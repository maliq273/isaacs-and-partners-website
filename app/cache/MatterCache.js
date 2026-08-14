/**
 * MatterCache
 *
 * Caches matter metadata, summaries and frequently accessed
 * matter state.
 *
 * Matter data remains authoritative in the repository/storage
 * layer. This cache must be invalidated after mutations.
 */

export default class MatterCache {
    constructor({
        ttl = 5 * 60 * 1000,
        maxEntries = 500,
    } = {}) {
        this.ttl = ttl;
        this.maxEntries = maxEntries;
        this.entries = new Map();
    }

    set(matterId, matter, options = {}) {
        this.validateId(matterId);

        const ttl = options.ttl ?? this.ttl;

        this.entries.set(
            String(matterId),
            {
                value: matter,
                createdAt: Date.now(),
                expiresAt:
                    ttl > 0
                        ? Date.now() + ttl
                        : null,
            }
        );

        this.enforceLimit();

        return matter;
    }

    get(matterId) {
        this.validateId(matterId);

        const entry = this.entries.get(
            String(matterId)
        );

        if (!entry) {
            return null;
        }

        if (this.isExpired(entry)) {
            this.entries.delete(String(matterId));
            return null;
        }

        return entry.value;
    }

    has(matterId) {
        return this.get(matterId) !== null;
    }

    delete(matterId) {
        return this.entries.delete(
            String(matterId)
        );
    }

    invalidateMatter(matterId) {
        return this.delete(matterId);
    }

    invalidateByClient(clientId) {
        for (const [matterId, entry] of this.entries.entries()) {
            if (
                entry.value &&
                entry.value.clientId === clientId
            ) {
                this.entries.delete(matterId);
            }
        }
    }

    invalidateByStatus(status) {
        for (const [matterId, entry] of this.entries.entries()) {
            if (
                entry.value &&
                entry.value.status === status
            ) {
                this.entries.delete(matterId);
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

    validateId(id) {
        if (
            id === undefined ||
            id === null ||
            id === ""
        ) {
            throw new Error("Matter ID is required");
        }
    }

    size() {
        return this.entries.size;
    }
}
