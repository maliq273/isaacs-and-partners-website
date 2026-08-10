/**
 * KnowledgeIndexer
 * ------------------------------------------------------------
 * Builds searchable indexes from knowledge-base domains.
 *
 * Indexes:
 * - titles
 * - citations
 * - legislation
 * - regulations
 * - case law
 * - articles
 * - handbooks
 * - internal case studies
 * - topics
 * - source references
 */

export class KnowledgeIndexer {
    constructor(options = {}) {
        this.logger = options.logger || console;

        this.index = {
            terms: new Map(),
            sources: new Map(),
            domains: new Map(),
            topics: new Map(),
            citations: new Map()
        };
    }

    build(domains = []) {
        this.clear();

        for (const domain of domains) {
            this.indexDomain(domain);
        }

        return this.getIndex();
    }

    indexDomain(domain) {
        if (!domain || !domain.id) {
            return;
        }

        this.index.domains.set(domain.id, {
            id: domain.id,
            name: domain.name,
            version: domain.version || null,
            jurisdiction:
                domain.jurisdiction ||
                "South Africa"
        });

        const collections = [
            "legislation",
            "regulations",
            "caseLaw",
            "articles",
            "handbooks",
            "internalCaseStudies",
            "procedures",
            "codesOfGoodPractice",
            "professionalRules"
        ];

        for (const collection of collections) {
            const records = Array.isArray(domain[collection])
                ? domain[collection]
                : [];

            records.forEach((record, index) => {
                this.indexSource({
                    ...record,
                    domainId: domain.id,
                    sourceType: collection,
                    index
                });
            });
        }
    }

    indexSource(source) {
        const sourceId =
            source.id ||
            `${source.domainId}:${source.sourceType}:${source.index}`;

        this.index.sources.set(sourceId, {
            ...source,
            id: sourceId
        });

        const searchableFields = [
            source.name,
            source.title,
            source.description,
            source.citation,
            source.sourceReference
        ];

        searchableFields
            .filter(Boolean)
            .forEach((value) => {
                this.addTerms(
                    value,
                    sourceId
                );
            });

        if (Array.isArray(source.topics)) {
            source.topics.forEach((topic) => {
                this.addToMap(
                    this.index.topics,
                    this.normalise(topic),
                    sourceId
                );
            });
        }

        if (source.citation) {
            this.addToMap(
                this.index.citations,
                this.normalise(source.citation),
                sourceId
            );
        }
    }

    addTerms(value, sourceId) {
        const terms = this.tokenise(value);

        for (const term of terms) {
            this.addToMap(
                this.index.terms,
                term,
                sourceId
            );
        }
    }

    addToMap(map, key, value) {
        if (!map.has(key)) {
            map.set(key, new Set());
        }

        map.get(key).add(value);
    }

    search(query) {
        const terms = this.tokenise(query);

        if (!terms.length) {
            return [];
        }

        const scores = new Map();

        for (const term of terms) {
            const matches =
                this.index.terms.get(term);

            if (!matches) {
                continue;
            }

            for (const sourceId of matches) {
                scores.set(
                    sourceId,
                    (scores.get(sourceId) || 0) + 1
                );
            }
        }

        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([sourceId, score]) => ({
                source:
                    this.index.sources.get(sourceId),
                score
            }));
    }

    searchTopic(topic) {
        const sourceIds =
            this.index.topics.get(
                this.normalise(topic)
            );

        if (!sourceIds) {
            return [];
        }

        return Array.from(sourceIds)
            .map((id) =>
                this.index.sources.get(id)
            )
            .filter(Boolean);
    }

    searchCitation(citation) {
        const sourceIds =
            this.index.citations.get(
                this.normalise(citation)
            );

        if (!sourceIds) {
            return [];
        }

        return Array.from(sourceIds)
            .map((id) =>
                this.index.sources.get(id)
            )
            .filter(Boolean);
    }

    getIndex() {
        return this.index;
    }

    getSource(sourceId) {
        return (
            this.index.sources.get(sourceId) ||
            null
        );
    }

    clear() {
        this.index.terms.clear();
        this.index.sources.clear();
        this.index.domains.clear();
        this.index.topics.clear();
        this.index.citations.clear();
    }

    tokenise(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/[^\w\s-]/g, " ")
            .split(/\s+/)
            .filter(Boolean);
    }

    normalise(value) {
        return String(value || "")
            .trim()
            .toLowerCase();
    }
}

export default KnowledgeIndexer;
