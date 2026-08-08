/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * KnowledgeQuery
 * ------------------------------------------------------------
 * Read-side query service for the knowledgebase.
 * ============================================================
 */

export default class KnowledgeQuery {

    constructor({
        repository
    } = {}) {

        this.repository = repository;

        // ====================================================
        // FUTURE INSERT
        //
        // Immigration legislation
        // DHA requirements
        // VFS requirements
        // CCMA rules
        // HR rules
        // Legal rules
        // Knowledge versioning
        // Effective-date intelligence
        //
        // ====================================================
    }

    requireRepository() {

        if (!this.repository) {
            throw new Error(
                "KnowledgeQuery requires KnowledgeRepository."
            );
        }

        return this.repository;
    }

    async byId(id) {

        return this.requireRepository()
            .findById(id);

    }

    async byType(type) {

        return this.requireRepository()
            .findByType(type);

    }

    async byCategory(category) {

        return this.requireRepository()
            .findByCategory(category);

    }

    async byCountry(country) {

        return this.requireRepository()
            .findByCountry(country);

    }

    async active() {

        return this.requireRepository()
            .findActive();

    }

    async search(query) {

        return this.requireRepository()
            .search(query);

    }

    async effectiveOn(date = new Date()) {

        return this.requireRepository()
            .findEffectiveOn(date);

    }

    // ========================================================
    // FUTURE INSERT
    //
    // Visa type requirements
    // Required-document rules
    // Eligibility rules
    // Appeal rules
    // Compliance rules
    // Knowledge source citations
    //
    // ========================================================

}
