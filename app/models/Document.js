/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Document
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Document extends Record {

    constructor(data = {}) {

        super(data);

        this.matterId =
            data.matterId ?? null;

        this.clientId =
            data.clientId ?? null;

        this.name =
            data.name ?? "";

        this.fileName =
            data.fileName ?? "";

        this.originalName =
            data.originalName ?? "";

        this.path =
            data.path ?? "";

        this.url =
            data.url ?? "";

        this.mimeType =
            data.mimeType ?? "";

        this.extension =
            data.extension ?? "";

        this.size =
            Number(data.size ?? 0);

        this.type =
            data.type ?? "OTHER";

        this.status =
            data.status ?? "UPLOADED";

        this.uploadedBy =
            data.uploadedBy ?? null;

        this.hash =
            data.hash ?? null;

        this.verified =
            data.verified === true;

        this.ocr = {
            completed:
                data.ocr?.completed === true,

            text:
                data.ocr?.text ?? "",

            confidence:
                data.ocr?.confidence ?? 0
        };

        this.aiAnalysis = {
            completed:
                data.aiAnalysis?.completed === true,

            classification:
                data.aiAnalysis?.classification ?? null,

            confidence:
                data.aiAnalysis?.confidence ?? 0,

            summary:
                data.aiAnalysis?.summary ?? ""
        };

        this.metadata = {
            ...this.metadata,
            ...(data.metadata ?? {})
        };

        // ====================================================
        // FUTURE INSERT
        //
        // OCR engine
        // AI document matching
        // Document classification
        // Virus scanning
        // Hash verification
        // VFS/DHA bundle matching
        // ====================================================
    }


    setMatter(
        matterId
    ) {

        this.matterId =
            matterId;

        this.touch();

        return this;

    }


    verify() {

        this.verified = true;

        this.status = "VERIFIED";

        this.touch();

        return this;

    }


    reject(
        reason = ""
    ) {

        this.verified = false;

        this.status = "REJECTED";

        this.metadata.rejectionReason =
            reason;

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.name && !this.originalName) {

            throw new Error(
                "Document name is required."
            );

        }

        return true;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Document versioning
    // AI matching
    // OCR processing
    // Translation matching
    // Submission bundle mapping
    // ========================================================

}
