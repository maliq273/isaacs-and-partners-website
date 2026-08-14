/**
 * ReportingEngine
 * ------------------------------------------------------------
 * Coordinates report queries and reporting/export layers.
 */

export class ReportingEngine {
    constructor({
        reportingService = null,
        reportQuery = null,
        reportExporter = null,
        logger = console
    } = {}) {
        this.reportingService =
            reportingService;
        this.reportQuery =
            reportQuery;
        this.reportExporter =
            reportExporter;
        this.logger = logger;
    }

    async generate(
        criteria = {},
        options = {}
    ) {
        if (
            this.reportingService
                ?.generate
        ) {
            return this.reportingService.generate(
                criteria,
                options
            );
        }

        if (
            this.reportQuery
                ?.execute
        ) {
            return this.reportQuery.execute(
                criteria,
                options
            );
        }

        throw new Error(
            "Reporting service or query is required"
        );
    }

    async export(
        report,
        format = "json",
        options = {}
    ) {
        if (
            !this.reportExporter
        ) {
            throw new Error(
                "ReportExporter is required"
            );
        }

        switch (
            String(format).toLowerCase()
        ) {
            case "csv":
                return this.reportExporter.toCSV(
                    report,
                    options
                );

            case "excel":
            case "xlsx":
                return this.reportExporter.toExcel(
                    report,
                    options
                );

            case "json":
                return this.reportExporter.toJSON(
                    report
                );

            default:
                throw new Error(
                    `Unsupported report format: ${format}`
                );
        }
    }
}

export default ReportingEngine;
