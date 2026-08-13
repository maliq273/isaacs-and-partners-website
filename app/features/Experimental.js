/**
 * Experimental Features
 * ------------------------------------------------------------
 * Experimental functionality is never enabled by default.
 *
 * Experimental features may change or be removed without
 * affecting the stable application contract.
 */

export const EXPERIMENTAL_FEATURES = Object.freeze({
    AI_PREDICTIVE_RISK: {
        key: "experimental.aiPredictiveRisk",
        name: "AI Predictive Risk",
        description:
            "Experimental AI-assisted risk pattern analysis.",
        defaultEnabled: false,
        requiresExplicitOptIn: true,
        requiresLicense: true
    },

    AI_CASE_STRATEGY: {
        key: "experimental.aiCaseStrategy",
        name: "AI Case Strategy",
        description:
            "Experimental AI-assisted case strategy suggestions.",
        defaultEnabled: false,
        requiresExplicitOptIn: true,
        requiresLicense: true
    },

    AUTOMATIC_BUNDLE_ASSEMBLY: {
        key: "experimental.automaticBundleAssembly",
        name: "Automatic Bundle Assembly",
        description:
            "Experimental automated bundle assembly.",
        defaultEnabled: false,
        requiresExplicitOptIn: true,
        requiresLicense: true
    },

    SEMANTIC_KNOWLEDGE_SEARCH: {
        key: "experimental.semanticKnowledgeSearch",
        name: "Semantic Knowledge Search",
        description:
            "Experimental semantic search across the knowledgebase.",
        defaultEnabled: false,
        requiresExplicitOptIn: true,
        requiresLicense: true
    },

    AI_DOCUMENT_CLASSIFICATION: {
        key: "experimental.aiDocumentClassification",
        name: "AI Document Classification",
        description:
            "Experimental automatic document classification.",
        defaultEnabled: false,
        requiresExplicitOptIn: true,
        requiresLicense: true
    }
});

export function getExperimentalFeatures() {
    return Object.values(
        EXPERIMENTAL_FEATURES
    );
}

export function getExperimentalFeature(key) {
    return getExperimentalFeatures().find(
        (feature) => feature.key === key
    ) || null;
}

export default EXPERIMENTAL_FEATURES;
