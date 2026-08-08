/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ClientQuery
 * ------------------------------------------------------------
 * Read-side query service for clients.
 * ============================================================
 */

export default class ClientQuery {

    constructor({
        repository
    } = {}) {

        this.repository = repository;

        // ====================================================
        // FUTURE INSERT
        //
        // Client portal queries
        // POPIA-controlled searches
        // Client deduplication
        // Client activity history
        //
        // ====================================================
    }

    requireRepository() {

        if (!this.repository) {
            throw new Error(
                "ClientQuery requires ClientRepository."
            );
        }

        return this.repository;
    }

    async byId(id) {

        return this.requireRepository()
            .findById(id);

    }

    async byEmail(email) {

        return this.requireRepository()
            .findByEmail(email);

    }

    async byPassportNumber(
        passportNumber
    ) {

        return this.requireRepository()
            .findByPassportNumber(
                passportNumber
            );

    }

    async byReferenceNumber(
        referenceNumber
    ) {

        return this.requireRepository()
            .findByReferenceNumber(
                referenceNumber
            );

    }

    async byPhone(phone) {

        return this.requireRepository()
            .findByPhone(phone);

    }

    async byMatter(matterId) {

        return this.requireRepository()
            .findByMatter(matterId);

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
    // Client dashboard summary
    // Matter history
    // Outstanding documents
    // Communication history
    // Billing history
    //
    // ========================================================

}
