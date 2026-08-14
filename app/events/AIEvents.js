/**
 * AIEvents
 * ------------------------------------------------------------
 * Canonical event names for AI operations.
 *
 * Events are intentionally represented as immutable constants
 * so managers/services can communicate without hard-coded
 * strings throughout the application.
 */

export const AIEvents = Object.freeze({
    REQUEST_STARTED:
        "ai.request.started",

    REQUEST_COMPLETED:
        "ai.request.completed",

    REQUEST_FAILED:
        "ai.request.failed",

    ANALYSIS_STARTED:
        "ai.analysis.started",

    ANALYSIS_COMPLETED:
        "ai.analysis.completed",

    ANALYSIS_FAILED:
        "ai.analysis.failed",

    DOCUMENT_ANALYSED:
        "ai.document.analysed",

    MATTER_ANALYSED:
        "ai.matter.analysed",

    RECOMMENDATION_GENERATED:
        "ai.recommendation.generated",

    RISK_DETECTED:
        "ai.risk.detected",

    KNOWLEDGE_RETRIEVED:
        "ai.knowledge.retrieved",

    PROMPT_CREATED:
        "ai.prompt.created",

    MODEL_RESPONSE_RECEIVED:
        "ai.model.response.received"
});

export default AIEvents;
