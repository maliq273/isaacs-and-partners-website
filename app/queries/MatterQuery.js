/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * MatterQuery
 * ------------------------------------------------------------
 * Read-side query service for matters.
 * ============================================================
 */

export default class MatterQuery {

    constructor({
        repository
    } = {}) {

        this.repository = repository;

        // ====================================================
        // FUTURE INSERT
        //
        // AI case intelligence
        // SLA monitoring
        // Matter dashboards
        // Workflow state
        // Bundle readiness
        // VFS/DHA submission state
        //
        // ====================================================
    }

    requireRepository() {

        if (!this.repository) {
            throw new Error(
                "MatterQuery requires MatterRepository."
            );
        }

        return this.repository;
    }

    async byId(id) {

        return this.requireRepository()
            .findById(id);

    }

    async byReferenceNumber(
        referenceNumber
    ) {

        return this.requireRepository()
            .findByReferenceNumber(
                referenceNumber
            );

    }

    async byClient(clientId) {

        return this.requireRepository()
            .findByClient(clientId);

    }

    async byCompany(companyId) {

        return this.requireRepository()
            .findByCompany(companyId);

    }

    async byStatus(status) {

        return this.requireRepository()
            .findByStatus(status);

    }

    async byStage(stage) {

        return this.requireRepository()
            .findByStage(stage);

    }

    async byDepartment(department) {

        return this.requireRepository()
            .findByDepartment(department);

    }

    async assignedTo(userId) {

        return this.requireRepository()
            .findAssignedTo(userId);

    }

    async open() {

        return this.requireRepository()
            .findOpen();

    }

    async withOutstandingDocuments() {

        return this.requireRepository()
            .findOutstandingDocuments();

    }

    async search(query, options = {}) {

        return this.requireRepository()
            .search(query, options);

    }

    async all(options = {}) {

        return this.requireRepository()
            .findAll(options);

    }

    // ========================================================
    // FUTURE INSERT
    //
    // Matters awaiting consultation
    // Matters awaiting documents
    // Matters ready for submission
    // Matters awaiting client action
    // Matters awaiting attorney action
    // High-risk matters
    // Overdue matters
    //
    // ========================================================

}
