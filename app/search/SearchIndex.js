/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SearchIndex
 * ------------------------------------------------------------
 * In-memory search index abstraction.
 * ============================================================
 */

export default class SearchIndex {

    constructor(options = {}) {

        this.name =
            options.name ?? "default";

        this.documents =
            new Map();

        this.tokens =
            new Map();

        // ====================================================
        // FUTURE INSERT
        //
        // IndexedDB search persistence
        // SQLite FTS
        // Supabase search index
        // Full-text indexing
        // Vector/semantic indexing
        //
        // ====================================================
    }


    add(
        id,
        document
    ) {

        if (!id) {

            throw new Error(
                "Search index requires an id."
            );

        }

        this.remove(id);

        this.documents.set(
            id,
            {
                ...document
            }
        );

        const content =
            this.getSearchableText(
                document
            );

        const words =
            this.tokenise(content);

        for (const word of words) {

            if (!this.tokens.has(word)) {

                this.tokens.set(
                    word,
                    new Set()
                );

            }

            this.tokens
                .get(word)
                .add(id);

        }

        return this;

    }


    remove(id) {

        const document =
            this.documents.get(id);

        if (!document) {

            return this;

        }

        const words =
            this.tokenise(
                this.getSearchableText(
                    document
                )
            );

        for (const word of words) {

            const ids =
                this.tokens.get(word);

            if (!ids) {
                continue;
            }

            ids.delete(id);

            if (ids.size === 0) {

                this.tokens.delete(word);

            }

        }

        this.documents.delete(id);

        return this;

    }


    get(id) {

        return this.documents.get(id);

    }


    search(tokens = []) {

        if (!tokens.length) {

            return [
                ...this.documents.values()
            ];

        }

        const ids =
            new Set();

        for (const token of tokens) {

            const matches =
                this.tokens.get(
                    token
                );

            if (!matches) {
                continue;
            }

            for (
                const id
                of matches
            ) {

                ids.add(id);

            }

        }

        return [
            ...ids
        ]
            .map(id =>
                this.documents.get(id)
            )
            .filter(Boolean);

    }


    getSearchableText(
        document
    ) {

        if (!document) {
            return "";
        }

        return [
            document.title,
            document.name,
            document.description,
            document.referenceNumber,
            document.email,
            document.phone,
            document.content,
            document.type,
            document.category,
            document.status
        ]
            .filter(Boolean)
            .join(" ");

        // ====================================================
        // FUTURE INSERT
        //
        // Matter fields
        // Client fields
        // Document OCR text
        // Knowledgebase content
        // Workflow fields
        //
        // ====================================================
    }


    tokenise(text) {

        return [
            ...new Set(
                String(text)
                    .toLowerCase()
                    .split(/\s+/)
                    .map(value =>
                        value.replace(
                            /[^\p{L}\p{N}_-]/gu,
                            ""
                        )
                    )
                    .filter(Boolean)
            )
        ];

    }


    clear() {

        this.documents.clear();

        this.tokens.clear();

        return this;

    }


    size() {

        return this.documents.size;

    }

}
