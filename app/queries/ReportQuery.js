/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ReportQuery
 * ------------------------------------------------------------
 * Read-side query service for reporting.
 * ============================================================
 */

export default class ReportQuery {

    constructor({
        repository = null,
        reportingService = null
    } = {}) {

        this.repository =
            repository;

        this.reportingService =
            reportingService;

        // ====================================================
        // FUTURE INSERT
        //
        // Financial reports
        // Matter reports
        // Client reports
        // Staff reports
        // Immigration reports
        // SARS reports
        // Management dashboards
        //
        // ====================================================
    }


    async execute(
        reportType,
        filters = {}
    ) {

        if (
            this.reportingService &&
            typeof this.reportingService.generate ===
            "function"
        ) {

            return this.reportingService.generate(
                reportType,
                filters
            );

        }

        if (
            this.repository &&
            typeof this.repository.findAll ===
            "function"
        ) {

            return this.repository.findAll({
                reportType,
                ...filters
            });

        }

        throw new Error(
            "ReportQuery requires a ReportingService or repository."
        );

    }


    async byType(
        reportType,
        filters = {}
    ) {

        return this.execute(
            reportType,
            filters
        );

    }


    async between(
        reportType,
        start,
        end,
        filters = {}
    ) {

        return this.execute(
            reportType,
            {
                ...filters,
                start,
                end
            }
        );

    }

    // ========================================================
    // FUTURE INSERT
    //
    // Sales Journal
    // Team Statistics
    // Matter Performance
    // Immigration Statistics
    // Revenue
    // Outstanding invoices
    // Payment reports
    // SARS reports
    // ========================================================

}
