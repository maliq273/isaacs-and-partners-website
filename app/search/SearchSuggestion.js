/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SearchSuggestion
 * ============================================================
 */

export default class SearchSuggestion {

    constructor(data = {}) {

        this.text =
            String(data.text ?? "");

        this.type =
            data.type ?? "QUERY";

        this.score =
            Number(data.score ?? 0);

        this.source =
            data.source ?? "SYSTEM";

        this.metadata =
            data.metadata ?? {};

        // ====================================================
        // FUTURE INSERT
        //
        // AI suggestions
        // Knowledgebase suggestions
        // Client/matter suggestions
        // Search-as-you-type
        // ====================================================
    }


    toJSON() {

        return {

            text: this.text,

            type: this.type,

            score: this.score,

            source: this.source,

            metadata: {
                ...this.metadata
            }

        };

    }

}
