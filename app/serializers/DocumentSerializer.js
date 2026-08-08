/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * DocumentSerializer
 * ------------------------------------------------------------
 * Converts Document domain objects into safe transport objects.
 * ============================================================
 */

export default class DocumentSerializer {

    static toJSON(document) {

        if (!document) {
            return null;
        }

        return {

            id:
                document.id ?? null,

            matterId:
                document.matterId ?? null,

            clientId:
                document.clientId ?? null,

            name:
                document.name ?? "",

            filename:
                document.filename ?? "",

            originalFilename:
                document.originalFilename ?? "",

            type:
                document.type ?? null,

            category:
                document.category ?? null,

            status:
                document.status ?? null,

            mimeType:
                document.mimeType ?? null,

            extension:
                document.extension ?? null,

            size:
                document.size ?? 0,

            path:
                document.path ?? null,

            storageKey:
                document.storageKey ?? null,

            checksum:
                document.checksum ?? null,

            version:
                document.version ?? 1,

            verified:
                document.verified ?? false,

            approved:
                document.approved ?? false,

            rejected:
                document.rejected ?? false,

            expiryDate:
                document.expiryDate ?? null,

            issueDate:
                document.issueDate ?? null,

            uploadedBy:
                document.uploadedBy ?? null,

            metadata:
                document.metadata ?? {},

            createdAt:
                document.createdAt ?? null,

            updatedAt:
                document.updatedAt ?? null

        };

        // ====================================================
        // FUTURE INSERT
        //
        // OCR results
        // AI document classification
        // Document matching score
        // Quality score
        // Authenticity indicators
        // Missing-document detection
        // Visa bundle position
        // VFS/DHA submission status
        //
        // ====================================================
    }


    static serialize(document) {

        return this.toJSON(document);

    }


    static serializeMany(
        documents = []
    ) {

        return documents
            .filter(Boolean)
            .map(
                document =>
                    this.toJSON(document)
            );

    }


    static fromJSON(data = {}) {

        return {
            ...data
        };

        // ====================================================
        // FUTURE INSERT
        // Rehydration into Document domain entity.
        // ====================================================
    }

}
