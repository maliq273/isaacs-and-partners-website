/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * BookingQuery
 * ------------------------------------------------------------
 * Read-side query service for bookings.
 * ============================================================
 */

export default class BookingQuery {

    constructor({
        repository
    } = {}) {

        this.repository = repository;

        // ====================================================
        // FUTURE INSERT
        //
        // Calendar provider queries
        // Staff availability
        // Conflict detection
        // Appointment reminders
        // External calendar synchronisation
        //
        // ====================================================
    }

    requireRepository() {

        if (!this.repository) {
            throw new Error(
                "BookingQuery requires BookingRepository."
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

    async byStaff(staffId) {

        return this.requireRepository()
            .findByStaff(staffId);

    }

    async byStatus(status) {

        return this.requireRepository()
            .findByStatus(status);

    }

    async upcoming(from = new Date()) {

        return this.requireRepository()
            .findUpcoming(from);

    }

    async between(start, end) {

        return this.requireRepository()
            .findBetween(start, end);

    }

    async hasConflict(start, end, options = {}) {

        return this.requireRepository()
            .hasConflict(start, end, options);

    }

    // ========================================================
    // FUTURE INSERT
    //
    // Dashboard booking statistics
    // Daily appointment schedule
    // Weekly appointment schedule
    // Cancellation analytics
    // No-show analytics
    //
    // ========================================================

}
