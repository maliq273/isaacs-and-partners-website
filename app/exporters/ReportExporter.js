/**
 * ReportExporter
 * ------------------------------------------------------------
 * Produces export-ready report structures.
 *
 * Supported formats:
 * - JSON
 * - CSV
 * - Excel
 *
 * CSV and Excel exporters are injected to avoid circular
 * dependencies.
 */

export class ReportExporter {
    constructor({
        CSVExporter = null,
        ExcelExporter = null,
        logger = console
    } = {}) {
        this.CSVExporter =
            CSVExporter;

        this.ExcelExporter =
            ExcelExporter;

        this.logger =
            logger;
    }

    prepare(report = {}) {
        if (
            report == null
        ) {
            throw new Error(
                "Report data is required"
            );
        }

        return {
            reportId:
                report.id ||
                report.reportId ||
                null,

            reportType:
                report.type ||
                report.reportType ||
                "general",

            title:
                report.title ||
                "Report",

            generatedAt:
                report.generatedAt ||
                new Date().toISOString(),

            generatedBy:
                report.generatedBy ||
                null,

            period:
                report.period ||
                null,

            summary:
                report.summary ||
                null,

            data:
                Array.isArray(
                    report.data
                )
                    ? report.data
                    : [],

            metadata:
                report.metadata || {}
        };
    }

    toJSON(report) {
        return JSON.stringify(
            this.prepare(
                report
            ),
            null,
            2
        );
    }

    toCSV(
        report,
        options = {}
    ) {
        if (!this.CSVExporter) {
            throw new Error(
                "CSVExporter dependency is required"
            );
        }

        const exporter =
            this.CSVExporter
                .prototype
                ? new this.CSVExporter(
                      options
                  )
                : this.CSVExporter;

        return exporter.export(
            this.prepare(
                report
            ).data,
            options
        );
    }

    toExcel(
        report,
        options = {}
    ) {
        if (!this.ExcelExporter) {
            throw new Error(
                "ExcelExporter dependency is required"
            );
        }

        const exporter =
            this.ExcelExporter
                .prototype
                ? new this.ExcelExporter(
                      options
                  )
                : this.ExcelExporter;

        const prepared =
            this.prepare(
                report
            );

        return exporter.export(
            prepared.data,
            {
                ...options,
                sheets:
                    options.sheets || {
                        Data:
                            prepared.data
                    }
            }
        );
    }

    getFilename(
        report,
        extension = "json"
    ) {
        const prepared =
            this.prepare(
                report
            );

        const base =
            prepared.title
                .toLowerCase()
                .trim()
                .replace(
                    /[^a-z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-|-$/g,
                    ""
                );

        return `${base || "report"}.${extension}`;
    }
}

export default ReportExporter;
