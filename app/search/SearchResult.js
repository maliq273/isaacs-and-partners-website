/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SearchResult
 * ============================================================
 */

export default class SearchResult {

    constructor(data = {}) {

        this.id =
            data.id ?? null;

        this.entityId =
            data.entityId ?? data.id ?? null;

        this.entityType =
            data.entityType ?? null;

        this.title =
            data.title ?? "";

        this.description =
            data.description ?? "";

        this.score =
            Number(data.score ?? 0);

        this.highlights =
            Array.isArray(data.highlights)
                ? [...data.highlights]
                : [];

        this.metadata =
            data.metadata ?? {};

        this.source =
            data.source ?? null;

        this.url =
            data.url ?? null;

        this.createdAt =
            data.createdAt ?? null;

        this.updatedAt =
            data.updatedAt ?? null;

        // ====================================================
        // FUTURE INSERT
        //
        // AI relevance explanation
        // Semantic similarity
        // Document preview
        // Search snippets
        // Permission metadata
        //
        // ====================================================
    }


    toJSON() {

        return {

            id: this.id,

            entityId: this.entityId,

            entityType: this.entityType,

            title: this.title,

            description: this.description,

            score: this.score,

            highlights: [
                ...this.highlights
            ],

            metadata: {
                ...this.metadata
            },

            source: this.source,

            url: this.url,

            createdAt: this.createdAt,

            updatedAt: this.updatedAt

        };

    }

}
