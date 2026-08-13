/**
 * Beta Features
 * ------------------------------------------------------------
 * Defines controlled beta functionality.
 *
 * Beta features are available only when:
 * - the feature is explicitly enabled;
 * - the application is operating in an allowed environment;
 * - licensing/access rules permit the feature.
 *
 * This file contains feature definitions only.
 * Evaluation is handled by FeatureFlags.
 */

export const BETA_FEATURES = Object.freeze({
    AI_CONSULTATION_ASSISTANT: {
        key: "ai.consultationAssistant",
        name: "AI Consultation Assistant",
        description:
            "AI-assisted consultation intake and preliminary matter analysis.",
        defaultEnabled: false,
        requiresLicense: true,
        environments: ["development", "staging", "production"]
    },

    AI_DOCUMENT_ANALYSIS: {
        key: "ai.documentAnalysis",
        name: "AI Document Analysis",
        description:
            "Analyses uploaded documents and identifies relevant information.",
        defaultEnabled: false,
        requiresLicense: true,
        environments: ["development", "staging", "production"]
    },

    AI_BUNDLE_ASSISTANT: {
        key: "ai.bundleAssistant",
        name: "AI Bundle Assistant",
        description:
            "Assists with document bundle preparation and outstanding-document detection.",
        defaultEnabled: false,
        requiresLicense: true,
        environments: ["staging", "production"]
    },

    SMART_DOCUMENT_MATCHING: {
        key: "documents.smartMatching",
        name: "Smart Document Matching",
        description:
            "Matches uploaded documents against matter requirements.",
        defaultEnabled: false,
        requiresLicense: true,
        environments: ["development", "staging", "production"]
    }
});

export function getBetaFeatures() {
    return Object.values(BETA_FEATURES);
}

export function getBetaFeature(key) {
    return getBetaFeatures().find(
        (feature) => feature.key === key
    ) || null;
}

export default BETA_FEATURES;
