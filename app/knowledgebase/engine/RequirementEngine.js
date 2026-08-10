/**
 * RequirementEngine
 * ------------------------------------------------------------
 * Determines documents / information normally required for
 * a matter based on the selected knowledge domain.
 *
 * IMPORTANT:
 * This is a requirement orchestration layer.
 * It does not replace current official requirements.
 */

export class RequirementEngine {
    constructor({
        knowledgeEngine,
        logger = console
    } = {}) {
        if (!knowledgeEngine) {
            throw new Error(
                "RequirementEngine requires KnowledgeEngine"
            );
        }

        this.knowledgeEngine = knowledgeEngine;
        this.logger = logger;

        this.rules = new Map();
    }

    /**
     * Register a requirement rule.
     */
    registerRule(rule) {
        if (!rule || !rule.id) {
            throw new Error(
                "Requirement rule requires an id"
            );
        }

        this.rules.set(rule.id, rule);

        return rule;
    }

    /**
     * Register multiple rules.
     */
    registerRules(rules = []) {
        rules.forEach((rule) =>
            this.registerRule(rule)
        );

        return rules;
    }

    /**
     * Determine requirements.
     */
    getRequirements({
        domainId,
        matterType = null,
        service = null,
        context = {},
        asAt = new Date().toISOString()
    } = {}) {
        const domain =
            this.knowledgeEngine.getDomain(domainId);

        if (!domain) {
            throw new Error(
                `Unknown knowledge domain: ${domainId}`
            );
        }

        const requirements = [];

        const rules = Array.from(
            this.rules.values()
        );

        for (const rule of rules) {
            if (
                rule.domainId &&
                rule.domainId !== domainId
            ) {
                continue;
            }

            if (
                rule.matterType &&
                rule.matterType !== matterType
            ) {
                continue;
            }

            if (
                rule.service &&
                rule.service !== service
            ) {
                continue;
            }

            if (
                typeof rule.when === "function" &&
                !rule.when(context)
            ) {
                continue;
            }

            requirements.push({
                ...rule,
                source: "RULE_ENGINE"
            });
        }

        /**
         * Immigration-specific fallback.
         */
        if (
            domainId === "immigration" &&
            Array.isArray(
                domain.applicationEngineRequirements
            )
        ) {
            domain.applicationEngineRequirements.forEach(
                (item) => {
                    requirements.push({
                        id: `immigration:${item}`,
                        name: this.humanise(item),
                        type: "DOCUMENT_OR_INFORMATION",
                        required: true,
                        source:
                            "KNOWLEDGE_BASE",
                        category:
                            "APPLICATION_REQUIREMENT"
                    });
                }
            );
        }

        return this.deduplicate(requirements);
    }

    /**
     * Validate supplied documents against requirements.
     */
    validateDocuments({
        requirements = [],
        documents = []
    } = {}) {
        const normalisedDocuments =
            documents.map((document) =>
                this.normaliseDocument(document)
            );

        const results = requirements.map(
            (requirement) => {
                const matches =
                    normalisedDocuments.filter(
                        (document) =>
                            this.documentMatchesRequirement(
                                document,
                                requirement
                            )
                    );

                return {
                    requirement,
                    satisfied: matches.length > 0,
                    matchedDocuments: matches
                };
            }
        );

        return {
            complete: results.every(
                (result) => result.satisfied || result.requirement.required === false
            ),
            results,
            outstanding: results
                .filter(
                    (result) =>
                        !result.satisfied &&
                        result.requirement.required !== false
                )
                .map((result) => result.requirement)
        };
    }

    /**
     * Document matching.
     */
    documentMatchesRequirement(
        document,
        requirement
    ) {
        const requirementText = [
            requirement.id,
            requirement.name,
            requirement.documentType,
            requirement.category
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const documentText = [
            document.id,
            document.name,
            document.fileName,
            document.type,
            document.documentType,
            ...(document.tags || [])
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return (
            documentText.includes(requirementText) ||
            requirementText
                .split(/\s+/)
                .filter(Boolean)
                .some((term) =>
                    documentText.includes(term)
                )
        );
    }

    normaliseDocument(document) {
        return {
            ...document,
            tags: Array.isArray(document.tags)
                ? document.tags
                : []
        };
    }

    deduplicate(items) {
        const map = new Map();

        items.forEach((item) => {
            const key =
                item.id ||
                `${item.name}:${item.category}`;

            map.set(key, item);
        });

        return Array.from(map.values());
    }

    humanise(value) {
        return String(value)
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, (character) =>
                character.toUpperCase()
            );
    }
}

export default RequirementEngine;
