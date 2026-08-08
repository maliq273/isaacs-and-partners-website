/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ReportingService
 * ============================================================
 *
 * LOCATION
 * app/services/ReportingService.js
 * ============================================================
 */

export default class ReportingService {

    constructor({
        matterRepository = null,
        clientRepository = null,
        documentRepository = null,
        bookingRepository = null,
        logger = null
    } = {}) {

        this.matterRepository =
            matterRepository;

        this.clientRepository =
            clientRepository;

        this.documentRepository =
            documentRepository;

        this.bookingRepository =
            bookingRepository;

        this.logger =
            logger;
    }

    async getMatterReport(
        filters = {}
    ) {

        const matters =
            await this.getMatters(
                filters
            );

        return {
            type: "matter",
            generatedAt: new Date(),
            total: matters.length,
            records: matters
        };
    }

    async getClientReport(
        filters = {}
    ) {

        const clients =
            await this.getClients(
                filters
            );

        return {
            type: "client",
            generatedAt: new Date(),
            total: clients.length,
            records: clients
        };
    }

    async getDocumentReport(
        filters = {}
    ) {

        const documents =
            await this.getDocuments(
                filters
            );

        return {
            type: "document",
            generatedAt: new Date(),
            total: documents.length,
            records: documents
        };
    }

    async getBookingReport(
        filters = {}
    ) {

        const bookings =
            await this.getBookings(
                filters
            );

        return {
            type: "booking",
            generatedAt: new Date(),
            total: bookings.length,
            records: bookings
        };
    }

    async getMatters(
        filters
    ) {

        if (
            this.matterRepository &&
            typeof this.matterRepository.findAll ===
            "function"
        ) {
            return this.matterRepository
                .findAll(filters);
        }

        return [];
    }

    async getClients(
        filters
    ) {

        if (
            this.clientRepository &&
            typeof this.clientRepository.findAll ===
            "function"
        ) {
            return this.clientRepository
                .findAll(filters);
        }

        return [];
    }

    async getDocuments(
        filters
    ) {

        if (
            this.documentRepository &&
            typeof this.documentRepository.findAll ===
            "function"
        ) {
            return this.documentRepository
                .findAll(filters);
        }

        return [];
    }

    async getBookings(
        filters
    ) {

        if (
            this.bookingRepository &&
            typeof this.bookingRepository.findAll ===
            "function"
        ) {
            return this.bookingRepository
                .findAll(filters);
        }

        return [];
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Dashboard analytics
     * Staff performance
     * Matter pipeline
     * Visa statistics
     * Document completion
     * Revenue
     * Consultation conversion
     * SLA reporting
     * AI performance
     * ========================================================
     */

}
