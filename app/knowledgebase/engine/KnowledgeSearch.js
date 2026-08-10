/**
 * KnowledgeSearch
 * ------------------------------------------------------------
 * Search engine for the legal knowledge base.
 *
 * Searches:
 * - legislation
 * - regulations
 * - case law
 * - articles
 * - handbooks
 * - internal case studies
 * - procedures
 */

export class KnowledgeSearch {
    constructor({
        loader,
        logger = console
    } = {}) {
        if (!loader) {
            throw new Error("KnowledgeSearch requires a KnowledgeLoader");
        }

        this.loader = loader;
        this.logger = logger;
    }

    /**
     * Search all registered domains.
     */
    search(query, options = {}) {
        const {
            domainId = null,
            sourceTypes = [],
            authorities = [],
            topics = [],
            asAt = null,
            limit = 25
        } = options;

        const searchTerms = this.tokenise(query);

        let sources = this.loader.getSources();

        if (domainId) {
            sources = sources.filter(
                (source) => source.domainId === domainId
            );
        }

        if (sourceTypes.length) {
            sources = sources.filter((source) =>
                sourceTypes.includes(source.sourceType)
            );
        }

        if (authorities.length) {
            sources = sources.filter((source) =>
                authorities.includes(source.authority)
            );
        }

        if (asAt) {
            sources = sources.filter((source) =>
                this.isEffectiveOnDate(source, asAt)
            );
        }

        if (topics.length) {
            sources = sources.filter((source) =>
                this.matchesTopics(source, topics)
            );
        }

        const results = sources
            .map((source) => ({
                source,
                score: this.calculateScore(
                    source,
                    searchTerms
                )
            }))
            .filter((result) => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return results;
    }

    /**
     * Search only legislation.
     */
    searchLegislation(query, options = {}) {
        return this.search(query, {
            ...options,
            sourceTypes: ["legislation"]
        });
    }

    /**
     * Search only case law.
     */
    searchCaseLaw(query, options = {}) {
        return this.search(query, {
            ...options,
            sourceTypes: ["caseLaw"]
        });
    }

    /**
     * Search regulations.
     */
    searchRegulations(query, options = {}) {
        return this.search(query, {
            ...options,
            sourceTypes: ["regulations"]
        });
    }

    /**
     * Search handbooks.
     */
    searchHandbooks(query, options = {}) {
        return this.search(query, {
            ...options,
            sourceTypes: ["handbooks"]
        });
    }

    /**
     * Search internal case studies.
     */
    searchInternalCases(query, options = {}) {
        return this.search(query, {
            ...options,
            sourceTypes: ["internalCaseStudies"]
        });
    }

    /**
     * Tokenise query.
     */
    tokenise(value) {
        if (!value) {
            return [];
        }

        return String(value)
            .toLowerCase()
            .replace(/[^\w\s-]/g, " ")
            .split(/\s+/)
            .filter(Boolean);
    }

    /**
     * Calculate relevance.
     */
    calculateScore(source, terms) {
        if (!terms.length) {
            return 0;
        }

        const searchableFields = [
            source.id,
            source.name,
            source.title,
            source.description,
            source.citation,
            source.sourceReference,
            source.authority,
            ...(source.topics || [])
        ];

        const text = searchableFields
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        let score = 0;

        for (const term of terms) {
            if (text.includes(term)) {
                score += 1;
            }

            if (
                String(source.name || "")
                    .toLowerCase()
                    .includes(term)
            ) {
                score += 4;
            }

            if (
                String(source.citation || "")
                    .toLowerCase()
                    .includes(term)
            ) {
                score += 5;
            }

            if (
                String(source.sourceReference || "")
                    .toLowerCase()
                    .includes(term)
            ) {
                score += 3;
            }
        }

        return score;
    }

    /**
     * Topic filtering.
     */
    matchesTopics(source, topics) {
        const sourceTopics = Array.isArray(source.topics)
            ? source.topics.map((topic) =>
                  String(topic).toLowerCase()
              )
            : [];

        return topics.some((topic) =>
            sourceTopics.includes(
                String(topic).toLowerCase()
            )
        );
    }

    /**
     * Effective-date filtering.
     */
    isEffectiveOnDate(source, date) {
        const target = new Date(date);

        if (Number.isNaN(target.getTime())) {
            return false;
        }

        if (source.effectiveFrom) {
            if (target < new Date(source.effectiveFrom)) {
                return false;
            }
        }

        if (source.effectiveTo) {
            if (target > new Date(source.effectiveTo)) {
                return false;
            }
        }

        return true;
    }
}

export default KnowledgeSearch;
