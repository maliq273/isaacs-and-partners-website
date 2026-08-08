/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SearchRanking
 * ============================================================
 */

export default class SearchRanking {

    constructor(options = {}) {

        this.weights = {

            exact:
                options.exact ?? 10,

            title:
                options.title ?? 8,

            reference:
                options.reference ?? 9,

            name:
                options.name ?? 7,

            description:
                options.description ?? 4,

            content:
                options.content ?? 2

        };

        // ====================================================
        // FUTURE INSERT
        //
        // AI semantic ranking
        // User behaviour ranking
        // Matter relevance
        // Recency ranking
        // Permission-aware ranking
        //
        // ====================================================
    }


    score(
        document,
        query
    ) {

        if (!document) {
            return 0;
        }

        const text =
            JSON.stringify(
                document
            ).toLowerCase();

        const queryText =
            String(
                query?.text ?? ""
            ).toLowerCase()
                .trim();

        if (!queryText) {
            return 0;
        }

        let score = 0;


        if (
            text === queryText
        ) {

            score +=
                this.weights.exact;

        }


        if (
            String(
                document.title ??
                ""
            )
                .toLowerCase()
                .includes(
                    queryText
                )
        ) {

            score +=
                this.weights.title;

        }


        if (
            String(
                document.referenceNumber ??
                ""
            )
                .toLowerCase()
                .includes(
                    queryText
                )
        ) {

            score +=
                this.weights.reference;

        }


        const tokens =
            query.tokens ?? [];

        for (const token of tokens) {

            if (
                String(
                    document.name ??
                    ""
                )
                    .toLowerCase()
                    .includes(token)
            ) {

                score +=
                    this.weights.name;

            }


            if (
                String(
                    document.description ??
                    ""
                )
                    .toLowerCase()
                    .includes(token)
            ) {

                score +=
                    this.weights.description;

            }


            if (
                String(
                    document.content ??
                    ""
                )
                    .toLowerCase()
                    .includes(token)
            ) {

                score +=
                    this.weights.content;

            }

        }

        return score;

    }


    rank(
        documents,
        query
    ) {

        return documents
            .map(document => ({

                document,

                score:
                    this.score(
                        document,
                        query
                    )

            }))
            .sort(
                (a, b) =>
                    b.score - a.score
            );

    }

}
