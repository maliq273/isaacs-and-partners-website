/**
 * KnowledgeEngine
 * ------------------------------------------------------------
 * Central knowledge orchestration layer.
 *
 * Responsibilities:
 * - Manage knowledge domains
 * - Query knowledge
 * - Retrieve sources
 * - Compare authority
 * - Apply effective-date filtering
 * - Provide context to downstream engines
 */

export class KnowledgeEngine {
    constructor({
        loader,
        search = null,
        requirementEngine = null,
        ruleEngine = null,
        logger = console
    } = {}) {
        if (!loader) {
            throw new Error("KnowledgeEngine requires a KnowledgeLoader");
        }

        this.loader = loader;
        this.search = search;
        this.requirementEngine = requirementEngine;
        this.ruleEngine = ruleEngine;
        this.logger = logger;
    }

    /**
     * Register knowledge domain.
     */
    register(domain) {
        return this.loader.upsert(domain);
    }

    /**
     * Retrieve domain.
     */
    getDomain(domainId) {
        return this.loader.get(domainId);
    }

    /**
     * Retrieve all domains.
     */
    getDomains() {
        return this.loader.getAll();
    }

    /**
     * Retrieve all sources.
     */
    getSources() {
        return this.loader.getSources();
    }

    /**
     * Search knowledge.
     */
    searchKnowledge(query, options = {}) {
        if (!this.search) {
            return [];
        }

        return this.search.search(query, {
            ...options,
            knowledgeBases: this.loader.getAll()
        });
    }

    /**
     * Get sources relevant to a legal domain.
     */
    getRelevantSources({
        domainId,
        topics = [],
        asAt = null,
        authority = null
    } = {}) {
        const domain = this.getDomain(domainId);

        if (!domain) {
            return [];
        }

        const sources = this.flattenSources(domain);

        return sources.filter((source) => {
            if (authority && source.authority !== authority) {
                return false;
            }

            if (
                asAt &&
                !this.isEffectiveOnDate(source, asAt)
            ) {
                return false;
            }

            if (!topics.length) {
                return true;
            }

            const sourceTopics = Array.isArray(source.topics)
                ? source.topics
                : [];

            return topics.some((topic) =>
                sourceTopics.some(
                    (sourceTopic) =>
                        String(sourceTopic).toLowerCase() ===
                        String(topic).toLowerCase()
                )
            );
        });
    }

    /**
     * Flatten domain sources.
     */
    flattenSources(domain) {
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

        const result = [];

        for (const collection of collections) {
            const records = Array.isArray(domain[collection])
                ? domain[collection]
                : [];

            records.forEach((record) => {
                result.push({
                    ...record,
                    sourceType: collection,
                    domainId: domain.id
                });
            });
        }

        return result;
    }

    /**
     * Authority ranking.
     */
    getAuthorityRank(authority) {
        const hierarchy = [
            "CONSTITUTION",
            "PRIMARY_LEGISLATION",
            "REGULATIONS",
            "RULES_OF_COURT",
            "COURT_JUDGMENT",
            "OFFICIAL_GUIDANCE",
            "PROFESSIONAL_RULES",
            "PROCEDURAL_SOURCE",
            "SECONDARY_COMMENTARY",
            "INTERNAL_CASE_STUDY",
            "UNCLASSIFIED"
        ];

        const index = hierarchy.indexOf(authority);

        return index === -1
            ? hierarchy.length
            : index;
    }

    /**
     * Sort by legal authority.
     */
    sortByAuthority(sources = []) {
        return [...sources].sort(
            (a, b) =>
                this.getAuthorityRank(a.authority) -
                this.getAuthorityRank(b.authority)
        );
    }

    /**
     * Check source effective date.
     */
    isEffectiveOnDate(source, date) {
        const target = new Date(date);

        if (Number.isNaN(target.getTime())) {
            return false;
        }

        if (source.effectiveFrom) {
            const from = new Date(source.effectiveFrom);

            if (target < from) {
                return false;
            }
        }

        if (source.effectiveTo) {
            const to = new Date(source.effectiveTo);

            if (target > to) {
                return false;
            }
        }

        return true;
    }

    /**
     * Build legal context for an AI analysis.
     */
    buildContext({
        domainId,
        topics = [],
        asAt = new Date().toISOString()
    } = {}) {
        const domain = this.getDomain(domainId);

        if (!domain) {
            throw new Error(`Unknown knowledge domain: ${domainId}`);
        }

        const sources = this.getRelevantSources({
            domainId,
            topics,
            asAt
        });

        return {
            domain: {
                id: domain.id,
                name: domain.name,
                version: domain.version,
                jurisdiction: domain.jurisdiction
            },
            asAt,
            sources: this.sortByAuthority(sources),
            sourceMetadata: domain.sourceMetadata || {},
            authorityWarning:
                "Secondary and internal sources must not be treated as primary legal authority."
        };
    }
}

export default KnowledgeEngine;
