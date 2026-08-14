/**
 * SessionCache
 *
 * Short-lived cache for authenticated session information.
 *
 * Security principles:
 * - Short TTL.
 * - Explicit expiration.
 * - No permanent persistence.
 * - Clear on logout.
 * - Avoid storing passwords or authentication secrets.
 */

export default class SessionCache {
    constructor({
        ttl = 15 * 60 * 1000,
        storage = null,
    } = {}) {
        this.ttl = ttl;
        this.storage = storage;
        this.entries = new Map();
    }

    set(sessionId, session, options = {}) {
        if (!sessionId) {
            throw new Error("Session ID is required");
        }

        const ttl = options.ttl ?? this.ttl;

        const value = {
            ...session,
        };

        this.entries.set(
            String(sessionId),
            {
                value,
                createdAt: Date.now(),
                expiresAt:
                    ttl > 0
                        ? Date.now() + ttl
                        : null,
            }
        );

        return value;
    }

    get(sessionId) {
        const entry = this.entries.get(
            String(sessionId)
        );

        if (!entry) {
            return null;
        }

        if (this.isExpired(entry)) {
            this.delete(sessionId);
            return null;
        }

        return {
            ...entry.value,
        };
    }

    has(sessionId) {
        return this.get(sessionId) !== null;
    }

    delete(sessionId) {
        return this.entries.delete(
            String(sessionId)
        );
    }

    clear() {
        this.entries.clear();
    }

    /**
     * Explicitly destroy all session information.
     * Should be called during logout.
     */
    destroySession(sessionId) {
        return this.delete(sessionId);
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

    size() {
        return this.entries.size;
    }
}
