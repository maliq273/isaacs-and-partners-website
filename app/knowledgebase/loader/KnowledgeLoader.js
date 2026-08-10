/**
 * KnowledgeLoader
 * ------------------------------------------------------------
 * Lower-level knowledge-base loader.
 *
 * This module sits beneath the knowledgebase engine layer.
 *
 * Responsibilities:
 * - Validate knowledge domains
 * - Register domains
 * - Cache domains
 * - Build search indexes
 * - Expose source retrieval
 * - Support version checks
 */

import KnowledgeCache from "./KnowledgeCache.js";
import KnowledgeIndexer from "./KnowledgeIndexer.js";
import KnowledgeValidator from "./KnowledgeValidator.js";

export class KnowledgeLoader {
    constructor(options = {}) {
        this.logger =
            options.logger || console;

        this.validator =
            options.validator ||
            new KnowledgeValidator({
                strict:
                    options.strict !== false,
                logger: this.logger
            });

        this.cache =
            options.cache ||
            new KnowledgeCache({
                ttl:
                    options.cacheTtl ??
                    30 * 60 * 1000
            });

        this.indexer =
            options.indexer ||
            new KnowledgeIndexer({
                logger: this.logger
            });

        this.domains = new Map();
    }

    /**
     * Load one domain.
     */
    load(domain, options = {}) {
        if (!domain) {
            throw new Error(
                "Knowledge domain is required"
            );
        }

        const validation =
            this.validator.validateDomain(
                domain
            );

        if (!validation.valid) {
            throw new Error(
                `Knowledge validation failed: ${validation.errors.join(
                    "; "
                )}`
            );
        }

        const normalised =
            this.normaliseDomain(domain);

        this.domains.set(
            normalised.id,
            normalised
        );

        this.cache.set(
            normalised.id,
            normalised,
            {
                ttl:
                    options.ttl === undefined
                        ? undefined
                        : options.ttl
            }
        );

        this.rebuildIndex();

        return normalised;
    }

    /**
     * Load multiple domains.
     */
    loadMany(domains = []) {
        if (!Array.isArray(domains)) {
            throw new TypeError(
                "domains must be an array"
            );
        }

        return domains.map(
            (domain) => this.load(domain)
        );
    }

    /**
     * Get domain.
     */
    get(domainId) {
        const cached =
            this.cache.get(domainId);

        if (cached) {
            return cached;
        }

        const domain =
            this.domains.get(domainId) ||
            null;

        if (domain) {
            this.cache.set(
                domainId,
                domain
            );
        }

        return domain;
    }

    /**
     * Get all domains.
     */
    getAll() {
        return Array.from(
            this.domains.values()
        );
    }

    /**
     * Determine whether domain exists.
     */
    has(domainId) {
        return this.domains.has(
            domainId
        );
    }

    /**
     * Remove domain.
     */
    remove(domainId) {
        const removed =
            this.domains.delete(
                domainId
            );

        this.cache.invalidateDomain(
            domainId
        );

        this.rebuildIndex();

        return removed;
    }

    /**
     * Clear everything.
     */
    clear() {
        this.domains.clear();
        this.cache.clear();
        this.indexer.clear();
    }

    /**
     * Search indexed knowledge.
     */
    search(query) {
        return this.indexer.search(
            query
        );
    }

    /**
     * Search by topic.
     */
    searchTopic(topic) {
        return this.indexer.searchTopic(
            topic
        );
    }

    /**
     * Search by citation.
     */
    searchCitation(citation) {
        return this.indexer.searchCitation(
            citation
        );
    }

    /**
     * Get a source by ID.
     */
    getSource(sourceId) {
        return (
            this.indexer.getSource(
                sourceId
            ) || null
        );
    }

    /**
     * Rebuild search index.
     */
    rebuildIndex() {
        this.indexer.build(
            this.getAll()
        );
    }

    /**
     * Validate all loaded domains.
     */
    validate() {
        return this.validator.validateAll(
            this.getAll()
        );
    }

    /**
     * Return version information.
     */
    getVersions() {
        return this.getAll().map(
            (domain) => ({
                id: domain.id,
                name: domain.name,
                version:
                    domain.version ||
                    null,
                effectiveFrom:
                    domain.effectiveFrom ||
                    null,
                lastReviewed:
                    domain.lastReviewed ||
                    domain.sourceMetadata
                        ?.lastReviewed ||
                    null
            })
        );
    }

    /**
     * Return a source-aware knowledge snapshot.
     */
    snapshot() {
        return {
            generatedAt:
                new Date().toISOString(),

            jurisdiction:
                "South Africa",

            domains:
                this.getVersions(),

            validation:
                this.validate(),

            cache:
                this.cache.stats()
        };
    }

    /**
     * Normalise domain metadata.
     */
    normaliseDomain(domain) {
        return {
            ...domain,

            version:
                domain.version ||
                "1.0.0",

            status:
                domain.status ||
                "active",

            jurisdiction:
                domain.jurisdiction ||
                "South Africa",

            language:
                domain.language ||
                "en-ZA",

            sourceMetadata:
                domain.sourceMetadata ||
                {},

            loadedAt:
                new Date().toISOString()
        };
    }
}

export default KnowledgeLoader;
