/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * UploadResult
 * ============================================================
 */

import Result from "./Result.js";

export default class UploadResult
    extends Result {

    constructor(data = {}) {

        super({

            ...data,

            code:
                data.code ??
                "UPLOAD_SUCCESS"

        });

        this.file =
            data.file ?? null;

        this.fileId =
            data.fileId ??
            data.file?.id ??
            null;

        this.filename =
            data.filename ??
            data.file?.filename ??
            "";

        this.mimeType =
            data.mimeType ??
            data.file?.mimeType ??
            null;

        this.size =
            Number(
                data.size ??
                data.file?.size ??
                0
            );

        this.storageKey =
            data.storageKey ??
            data.file?.storageKey ??
            null;

        this.path =
            data.path ??
            data.file?.path ??
            null;

        this.checksum =
            data.checksum ??
            null;

        this.ocr =
            data.ocr ?? null;

        // ====================================================
        // FUTURE INSERT
        //
        // OCR processing
        // AI classification
        // Document matching
        // Virus scanning
        // Image extraction
        // PDF processing
        // Bundle placement
        //
        // ====================================================
    }

}
