/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SearchEngine
 * ------------------------------------------------------------
 * Central search service for the platform.
 * ============================================================
 */

import SearchIndex
    from "./SearchIndex.js";

import SearchParser
    from "./SearchParser.js";

import SearchRanking
    from "./SearchRanking.js";

import SearchResult
    from "./SearchResult.js";

import SearchHistory
    from "./SearchHistory.js";

import SearchSuggestion
    from "./SearchSuggestion.js";

export default class SearchEngine {

    constructor(options = {}) {

        this.index =
            options.index ??
            new SearchIndex();

        this.parser =
            options.parser ??
            new SearchParser();

        this.ranking =
            options.ranking ??
            new SearchRanking();

        this.history =
            options.history ??
            new SearchHistory();

        // ====================================================
        // FUTURE INSERT
        //
        // KnowledgeEngine
        // AI semantic search
        // Repository search adapters
        // Permission engine
        // Search analytics
        //
        // ====================================================
    }


    indexDocument(
        id,
        document
    ) {

        this.index.add(
            id,
            document
        );

        return this;

    }


    removeFromIndex(
        id
    ) {

        this.index.remove(
            id
        );

        return this;

    }


    search(
        input,
        options = {}
    ) {

        const query =
            this.parser.parse(
                input,
                options
            );


        if (
            options.recordHistory !==
            false
        ) {

            this.history.add(
                query
            );

        }


        const candidates =
            this.index.search(
                query.tokens
            );


        const ranked =
            this.ranking.rank(
                candidates,
                query
            );


        const start =
            query.offset;

        const end =
            start +
            query.limit;


        const results =
            ranked
                .slice(
                    start,
                    end
                )
                .map(
                    item =>
                        new SearchResult({

                            entityId:
                                item.document.id,

                            entityType:
                                item.document.entityType ??
                                item.document.type ??
                                null,

                            title:
                                item.document.title ??
                                item.document.name ??
                                "",

                            description:
                                item.document.description ??
                                "",

                            score:
                                item.score,

                            metadata:
                                item.document

                        })
                );


        return {

            query,

            results,

            total:
                ranked.length,

            page:
                query.page,

            limit:
                query.limit,

            hasMore:
                end <
                ranked.length

        };

    }


    suggest(
        input,
        limit = 10
    ) {

        const query =
            this.parser.parse(
                input,
                {
                    recordHistory: false
                }
            );


        const candidates =
            this.index.search(
                query.tokens
            );


        const suggestions =
            candidates
                .map(document =>
                    new SearchSuggestion({

                        text:
                            document.title ??
                            document.name ??
                            document.referenceNumber ??
                            "",

                        type:
                            document.entityType ??
                            document.type ??
                            "RESULT",

                        score:
                            this.ranking.score(
                                document,
                                query
                            ),

                        source:
                            "INDEX",

                        metadata: {
                            id:
                                document.id
                        }

                    })
                )
                .filter(
                    suggestion =>
                        suggestion.text
                )
                .sort(
                    (a, b) =>
                        b.score - a.score
                )
                .slice(
                    0,
                    limit
                );


        return suggestions;

    }


    clearIndex() {

        this.index.clear();

        return this;

    }

}
