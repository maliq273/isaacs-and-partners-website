/**
 * Isaacs and Partners
 * Knowledge Base Configuration
 */

const knowledgeConfig = Object.freeze({
    enabled: true,

    version: "1.0.0",

    sourceDirectory:
        "./knowledgebase",

    domains: Object.freeze([
        "business",
        "ccma",
        "contracts",
        "hr",
        "immigration",
        "labour",
        "mediation",
        "notary",
    ]),

    engines: Object.freeze({
        loader: true,
        search: true,
        rules: true,
        requirements: true,
        documents: true,
        indexing: true,
    }),

    sources: Object.freeze({
        legislation: true,
        regulations: true,
        caseLaw: true,
        articles: true,
        handbooks: true,
        internalCaseStudies: true,
        officialGuidance: true,
    }),

    search: Object.freeze({
        minimumScore: 0.60,
        preferredScore: 0.80,
        maxResults: 25,
        includeRelatedSources: true,
        includeVersionMetadata: true,
    }),

    validation: Object.freeze({
        requireSource: true,
        requireAuthorityLevel: true,
        requireDate: true,
        requireVersion: true,
        rejectUnverifiedSources: true,
    }),

    legalSafety: Object.freeze({
        distinguishLawFromGuidance: true,
        distinguishCaseLawFromLegislation: true,
        identifyRepealedLaw: true,
        identifyAmendments: true,
        identifyConflictingAuthorities: true,
        preserveCitations: true,
        neverTreatAIOutputAsAuthority: true,
    }),

    caching: Object.freeze({
        enabled: true,
        durationMinutes: 60,
        invalidateOnVersionChange: true,
    }),
});

export default knowledgeConfig;
