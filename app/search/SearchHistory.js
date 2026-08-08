/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SearchHistory
 * ============================================================
 */

export default class SearchHistory {

    constructor(options = {}) {

        this.maxEntries =
            options.maxEntries ?? 50;

        this.entries = [];

        this.storageKey =
            options.storageKey ??
            "isaacs_search_history";

        // ====================================================
        // FUTURE INSERT
        //
        // User-specific history
        // Supabase persistence
        // Audit history
        // Search analytics
        //
        // ====================================================
    }


    add(
        query
    ) {

        const value =
            typeof query === "string"
                ? query.trim()
                : query?.text?.trim();

        if (!value) {

            return this;

        }

        this.entries =
            this.entries.filter(
                entry =>
                    entry.query !== value
            );

        this.entries.unshift({

            query: value,

            createdAt:
                new Date().toISOString()

        });

        this.entries =
            this.entries.slice(
                0,
                this.maxEntries
            );

        return this;

    }


    all() {

        return [
            ...this.entries
        ];

    }


    recent(
        limit = 10
    ) {

        return this.entries
            .slice(
                0,
                limit
            );

    }


    clear() {

        this.entries = [];

        return this;

    }


    remove(
        query
    ) {

        this.entries =
            this.entries.filter(
                entry =>
                    entry.query !== query
            );

        return this;

    }


    toJSON() {

        return [
            ...this.entries
        ];

    }

}
