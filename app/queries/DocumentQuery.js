/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * DocumentQuery
 * ------------------------------------------------------------
 * Read-side query service for documents.
 * ============================================================
 */

export default class DocumentQuery {

    constructor({
        repository
    } = {}) {

        this.repository = repository;

        // ====================================================
        // FUTURE INSERT
        //
        // AI document matching
        // OCR results
        // Document expiry
        // VFS/DHA bundle readiness
        // Missing-document detection
        // Document version history
        //
        // ====================================================
    }

    requireRepository() {

        if (!this.repository) {
            throw new Error(
                "DocumentQuery requires DocumentRepository."
            );
        }

        return this.repository;
    }

    async byId(id) {

        return this.requireRepository()
            .findById(id);

    }

    async byMatter(matterId) {

        return this.requireRepository()
            .findByMatter(matterId);

    }

    async byClient(clientId) {

        return this.requireRepository()
            .findByClient(clientId);

    }

    async byStatus(status) {

        return this.requireRepository()
            .findByStatus(status);

    }

    async byType(type) {

        return this.requireRepository()
            .findByType(type);

    }

    async outstanding(matterId = null) {

        return this.requireRepository()
            .findOutstanding(matterId);

    }

    async expiringBefore(date) {

        return this.requireRepository()
            .findExpiringBefore(date);

    }

    async byChecksum(checksum) {

        return this.requireRepository()
            .findByChecksum(checksum);

    }

    // ========================================================
    // FUTURE INSERT
    //
    // Required documents
    // Missing documents
    // Duplicate documents
    // Expired documents
    // Rejected documents
    // Bundle-ready documents
    //
    // ========================================================

}
