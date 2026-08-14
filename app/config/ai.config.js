/**
 * Isaacs and Partners
 * AI Configuration
 *
 * Central configuration for all AI services, engines,
 * classifiers, analysis modules and safety controls.
 */

const aiConfig = Object.freeze({
    enabled: true,

    provider: "google",

    models: Object.freeze({
        primary: "gemini-2.5-pro",
        fast: "gemini-2.5-flash",
        vision: "gemini-2.5-flash",
        embedding: "text-embedding-004",
    }),

    generation: Object.freeze({
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,
    }),

    analysis: Object.freeze({
        case: true,
        completeness: true,
        compliance: true,
        document: true,
        eligibility: true,
        image: true,
        ocr: true,
        quality: true,
        recommendation: true,
        risk: true,
        summary: true,
    }),

    classifiers: Object.freeze({
        complexity: true,
        department: true,
    }),

    engines: Object.freeze({
        ai: true,
        automation: true,
        compliance: true,
        eligibility: true,
        knowledge: true,
        risk: true,
        workflow: true,
    }),

    thresholds: Object.freeze({
        confidenceMinimum: 0.75,
        eligibilityMinimum: 0.75,
        documentMatchMinimum: 0.80,
        ocrMinimum: 0.80,
        recommendationMinimum: 0.70,
        riskEscalation: 0.70,
    }),

    limits: Object.freeze({
        maxDocumentsPerAnalysis: 100,
        maxImagesPerAnalysis: 50,
        maxPromptCharacters: 100000,
        maxResponseTokens: 8192,
    }),

    behaviour: Object.freeze({
        requireHumanReviewForLegalAdvice: true,
        requireHumanReviewForLowConfidence: true,
        requireHumanReviewForHighRisk: true,
        neverInventLegalAuthority: true,
        neverInventDocuments: true,
        preserveSourceReferences: true,
        preserveKnowledgeVersion: true,
        logAIRequests: true,
        logAIResponses: false,
    }),

    fallback: Object.freeze({
        enabled: true,
        useKnowledgeBase: true,
        useDeterministicRules: true,
        allowDegradedMode: true,
    }),

    privacy: Object.freeze({
        minimisePersonalData: true,
        maskSensitiveDataInLogs: true,
        retainPrompts: false,
        retainResponses: false,
    }),
});

export default aiConfig;
