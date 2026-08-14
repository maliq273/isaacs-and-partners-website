/**
 * KnowledgeEngine
 * ------------------------------------------------------------
 * Central access layer for the application's knowledgebase.
 *
 * Connects to the existing knowledgebase engines/loaders.
 */

export class KnowledgeEngine {
    constructor({
        loader = null,
        search = null,
        ruleEngine = null,
        requirementEngine = null,
        knowledgeService = null,
        logger = console
    } = {}) {
        this.loader = loader;
        this.searchEngine = search;
        this.ruleEngine =
            ruleEngine;
        this.requirementEngine =
            requirementEngine;
        this.knowledgeService =
            knowledgeService;
        this.logger = logger;
    }

    async search(
        query,
        options = {}
    ) {
        if (
            this.knowledgeService
                ?.search
        ) {
            return this.knowledgeService.search(
                query,
                options
            );
        }

        if (
            this.searchEngine?.search
        ) {
            return this.searchEngine.search(
                query,
                options
            );
        }

        return [];
    }

    async getRequiredDocuments(
        matter,
        options = {}
    ) {
        if (
            this.requirementEngine
                ?.getRequiredDocuments
        ) {
            return this.requirementEngine.getRequiredDocuments(
                matter,
                options
            );
        }

        if (
            this.knowledgeService
                ?.getRequiredDocuments
        ) {
            return this.knowledgeService.getRequiredDocuments(
                matter,
                options
            );
        }

        return [];
    }

    async getEligibilityCriteria(
        subject,
        options = {}
    ) {
        if (
            this.knowledgeService
                ?.getEligibilityCriteria
        ) {
            return this.knowledgeService.getEligibilityCriteria(
                subject,
                options
            );
        }

        if (
            this.ruleEngine
                ?.getEligibilityCriteria
        ) {
            return this.ruleEngine.getEligibilityCriteria(
                subject,
                options
            );
        }

        return [];
    }

    async getDomain(
        domain,
        options = {}
    ) {
        if (
            this.loader?.loadDomain
        ) {
            return this.loader.loadDomain(
                domain,
                options
            );
        }

        if (
            this.loader?.load
        ) {
            return this.loader.load(
                domain,
                options
            );
        }

        return null;
    }

    async evaluateRule(
        rule,
        context,
        options = {}
    ) {
        if (
            !this.ruleEngine?.evaluate
        ) {
            throw new Error(
                "RuleEngine is required"
            );
        }

        return this.ruleEngine.evaluate(
            rule,
            context,
            options
        );
    }
}

export default KnowledgeEngine;
