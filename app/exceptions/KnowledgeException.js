import ApplicationException from "./ApplicationException.js";

/**
 * KnowledgeException
 * ------------------------------------------------------------
 * Knowledgebase loading, indexing, searching, validation,
 * rules, or source processing failure.
 */

export class KnowledgeException extends ApplicationException {
    constructor(
        message = "Knowledgebase operation failed",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "KNOWLEDGE_ERROR",
            status:
                options.status || 500
        });

        this.name =
            "KnowledgeException";
    }
}

export default KnowledgeException;
