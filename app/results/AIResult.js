/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * AIResult
 * ------------------------------------------------------------
 * Standard result for AI analysis and intelligence modules.
 * ============================================================
 */

import Result from "./Result.js";

export default class AIResult
    extends Result {

    constructor(data = {}) {

        super({

            ...data,

            code:
                data.code ??
                "AI_SUCCESS"

        });

        this.analysis =
            data.analysis ?? null;

        this.confidence =
            Number(
                data.confidence ?? 0
            );

        this.riskScore =
            Number(
                data.riskScore ?? 0
            );

        this.recommendations =
            Array.isArray(
                data.recommendations
            )
                ? [...data.recommendations]
                : [];

        this.reasoning =
            data.reasoning ?? null;

        this.workflow =
            data.workflow ?? null;

        this.sources =
            Array.isArray(data.sources)
                ? [...data.sources]
                : [];

        // ====================================================
        // FUTURE INSERT
        //
        // AI model information
        // Prompt version
        // Knowledgebase version
        // Explainability
        // Token usage
        // AI audit trail
        // Human review requirement
        //
        // ====================================================
    }


    getConfidencePercent() {

        return Math.round(
            this.confidence * 100
        );

    }

}
