/**
 * DocumentCache
 *
 * Cache for document metadata and document-processing results.
 *
 * Never store sensitive document contents in an ordinary
 * application cache unless the underlying storage explicitly
 * provides appropriate encryption and access controls.
 */

export default class DocumentCache {
    constructor({
        ttl = 10 * 60 * 1000,
        maxEntries = 500,
    } = {}) {
        this.ttl = ttl;
        this.maxEntries = maxEntries;
        this.entries = new Map();
    }

    set(documentId, document, options = {}) {
        this.validateId(documentId);

        const ttl = options.ttl ?? this.ttl;

        this.entries.set(
            String(documentId),
            {
                value: document,
                createdAt: Date.now(),
                expiresAt:
                    ttl > 0
                        ? Date.now() + ttl
                        : null,
            }
        );

        this.enforceLimit();

        return document;
    }

    get(documentId) {
        this.validateId(documentId);

        const entry = this.entries.get(
            String(documentId)
        );

        if (!entry) {
            return null;
        }

        if (this.isExpired(entry)) {
            this.entries.delete(String(documentId));
            return null;
        }

        return entry.value;
    }

    has(documentId) {
        return this.get(documentId) !== null;
    }

    delete(documentId) {
        return this.entries.delete(
            String(documentId)
        );
    }

    invalidateDocument(documentId) {
        return this.delete(documentId);
    }

    invalidateMatter(matterId) {
        for (const [documentId, entry] of this.entries.entries()) {
            if (
                entry.value &&
                entry.value.matterId === matterId
            ) {
                this.entries.delete(documentId);
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
            throw new Error("Document ID is required");
        }
    }

    size() {
        return this.entries.size;
    }
}
