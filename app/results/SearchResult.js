/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SearchResult
 * ------------------------------------------------------------
 * Standardised search operation result.
 * ============================================================
 */

import Result from "./Result.js";

export default class SearchResult
    extends Result {

    constructor(data = {}) {

        super({

            ...data,

            code:
                data.code ??
                "SEARCH_SUCCESS"

        });

        this.query =
            data.query ?? null;

        this.results =
            Array.isArray(data.results)
                ? [...data.results]
                : [];

        this.total =
            Number(data.total ?? this.results.length);

        this.page =
            Number(data.page ?? 1);

        this.limit =
            Number(data.limit ?? this.results.length);

        this.hasMore =
            Boolean(data.hasMore ?? false);

        // ====================================================
        // FUTURE INSERT
        //
        // Search suggestions
        // AI semantic ranking
        // Search facets
        // Search filters
        // Saved searches
        //
        // ====================================================
    }


    getResultCount() {

        return this.results.length;

    }

}
