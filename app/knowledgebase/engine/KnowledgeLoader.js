/**
 * KnowledgeLoader
 * ------------------------------------------------------------
 * Loads and normalises Isaacs & Partners knowledge-base domains.
 *
 * Responsibilities:
 * - Load JSON knowledge domains
 * - Validate basic structure
 * - Normalise records
 * - Attach source metadata
 * - Track versions
 * - Prevent duplicate domain registration
 *
 * This module does NOT make legal conclusions.
 */

export class KnowledgeLoader {
    constructor(options = {}) {
        this.options = {
            strict: options.strict !== false,
            logger: options.logger || console,
            ...options
        };

        this.domains = new Map();
        this.sources = new Map();
    }

    /**
     * Register a knowledge-base domain.
     *
     * @param {Object} knowledgeBase
     * @returns {Object}
     */
    register(knowledgeBase) {
        this.assertKnowledgeBase(knowledgeBase);

        const normalised = this.normaliseKnowledgeBase(knowledgeBase);

        if (this.domains.has(normalised.id)) {
            throw new Error(
                `Knowledge domain already registered: ${normalised.id}`
            );
        }

        this.domains.set(normalised.id, normalised);

        this.registerSources(normalised);

        return normalised;
    }

    /**
     * Register or replace a knowledge domain.
     */
    upsert(knowledgeBase) {
        this.assertKnowledgeBase(knowledgeBase);

        const normalised = this.normaliseKnowledgeBase(knowledgeBase);

        this.domains.set(normalised.id, normalised);

        this.registerSources(normalised);

        return normalised;
    }

    /**
     * Load multiple domains.
     */
    loadMany(knowledgeBases = []) {
        if (!Array.isArray(knowledgeBases)) {
            throw new TypeError("knowledgeBases must be an array");
        }

        return knowledgeBases.map((knowledgeBase) =>
            this.upsert(knowledgeBase)
        );
    }

    /**
     * Retrieve a domain.
     */
    get(domainId) {
        return this.domains.get(domainId) || null;
    }

    /**
     * Retrieve all domains.
     */
    getAll() {
        return Array.from(this.domains.values());
    }

    /**
     * Check if domain exists.
     */
    has(domainId) {
        return this.domains.has(domainId);
    }

    /**
     * Remove domain.
     */
    remove(domainId) {
        const removed = this.domains.delete(domainId);

        if (removed) {
            for (const [sourceId, source] of this.sources.entries()) {
                if (source.domainId === domainId) {
                    this.sources.delete(sourceId);
                }
            }
        }

        return removed;
    }

    /**
     * Register sources contained within a knowledge domain.
     */
    registerSources(domain) {
        const sourceCollections = [
            "legislation",
            "regulations",
            "caseLaw",
            "articles",
            "handbooks",
            "internalCaseStudies"
        ];

        for (const collectionName of sourceCollections) {
            const records = Array.isArray(domain[collectionName])
                ? domain[collectionName]
                : [];

            records.forEach((record, index) => {
                const sourceId =
                    record.id ||
                    record.sourceReference ||
                    `${domain.id}:${collectionName}:${index}`;

                this.sources.set(sourceId, {
                    ...record,
                    id: sourceId,
                    domainId: domain.id,
                    sourceType: collectionName,
                    authority:
                        record.authority ||
                        this.getDefaultAuthority(collectionName)
                });
            });
        }
    }

    /**
     * Normalise the top-level knowledge base.
     */
    normaliseKnowledgeBase(knowledgeBase) {
        const sourceCollections = [
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

        const result = {
            ...knowledgeBase,

            version: knowledgeBase.version || "1.0.0",

            status: knowledgeBase.status || "active",

            jurisdiction:
                knowledgeBase.jurisdiction || "South Africa",

            language:
                knowledgeBase.language || "en-ZA",

            loadedAt: new Date().toISOString()
        };

        for (const collection of sourceCollections) {
            if (!Array.isArray(result[collection])) {
                result[collection] = [];
            }
        }

        if (!result.sourceMetadata) {
            result.sourceMetadata = {};
        }

        return result;
    }

    /**
     * Validate minimum domain structure.
     */
    assertKnowledgeBase(knowledgeBase) {
        if (!knowledgeBase || typeof knowledgeBase !== "object") {
            throw new TypeError("Knowledge base must be an object");
        }

        if (!knowledgeBase.id) {
            throw new Error("Knowledge base requires an id");
        }

        if (!knowledgeBase.name) {
            throw new Error(
                `Knowledge base "${knowledgeBase.id}" requires a name`
            );
        }

        if (
            this.options.strict &&
            knowledgeBase.jurisdiction &&
            knowledgeBase.jurisdiction !== "South Africa"
        ) {
            throw new Error(
                `Unsupported jurisdiction for ${knowledgeBase.id}: ${knowledgeBase.jurisdiction}`
            );
        }
    }

    /**
     * Get default authority classification.
     */
    getDefaultAuthority(collectionName) {
        const authorityMap = {
            legislation: "PRIMARY_LEGISLATION",
            regulations: "REGULATIONS",
            caseLaw: "COURT_JUDGMENT",
            articles: "SECONDARY_COMMENTARY",
            handbooks: "OFFICIAL_GUIDANCE",
            internalCaseStudies: "INTERNAL_CASE_STUDY"
        };

        return authorityMap[collectionName] || "UNCLASSIFIED";
    }

    /**
     * Return all registered sources.
     */
    getSources() {
        return Array.from(this.sources.values());
    }

    /**
     * Find source by ID.
     */
    getSource(sourceId) {
        return this.sources.get(sourceId) || null;
    }

    /**
     * Export loader state.
     */
    export() {
        return {
            domains: this.getAll(),
            sources: this.getSources()
        };
    }

    clear() {
        this.domains.clear();
        this.sources.clear();
    }
}

export default KnowledgeLoader;
