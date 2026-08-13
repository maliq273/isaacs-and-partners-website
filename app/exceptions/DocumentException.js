import ApplicationException from "./ApplicationException.js";

/**
 * DocumentException
 * ------------------------------------------------------------
 * Document processing, validation, OCR, generation, storage,
 * or document workflow failure.
 */

export class DocumentException extends ApplicationException {
    constructor(
        message = "Document operation failed",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "DOCUMENT_ERROR",
            status:
                options.status || 422
        });

        this.name =
            "DocumentException";
    }
}

export default DocumentException;
