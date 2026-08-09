/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Document Mapper
 * ------------------------------------------------------------
 * Maps documents between domain, storage and API layers.
 * ============================================================
 */

export default class DocumentMapper {

    static toPersistence(document) {

        if (!document) {
            return null;
        }

        const data =
            typeof document.toJSON === "function"
                ? document.toJSON()
                : { ...document };

        return {
            ...data,
            id: document.id ?? data.id ?? null
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // OCR metadata
        // File hash
        // MIME mapping
        // Storage path
        // Document versioning
        // VFS/DHA document classification
        // ====================================================
    }


    static fromPersistence(data) {

        if (!data) {
            return null;
        }

        return {
            ...data
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Document model rehydration
        // Secure file references
        // OCR reconstruction
        // AI classification reconstruction
        // ====================================================
    }


    static toTransport(document) {

        if (!document) {
            return null;
        }

        const data =
            this.toPersistence(document);

        return {
            ...data,

            // Never expose internal storage secrets.
            storagePath:
                undefined
        };
    }


    static collection(items = []) {

        return items
            .filter(Boolean)
            .map(item =>
                this.toPersistence(item)
            );
    }

}
