/**
 * ReportBuilder
 *
 * Builds structured reporting data before it is rendered
 * by ReportExporter or PDFBuilder.
 */

export default class ReportBuilder {
    constructor({
        title = null,
        type = "GENERAL",
    } = {}) {
        this.report = {
            title,
            type,
            description: null,

            generatedAt: null,

            filters: {},
            columns: [],
            rows: [],

            summary: {},
            metadata: {},
        };
    }

    setTitle(title) {
        this.report.title = title;
        return this;
    }

    setType(type) {
        this.report.type = type;
        return this;
    }

    setDescription(description) {
        this.report.description = description;
        return this;
    }

    setFilters(filters = {}) {
        this.report.filters = {
            ...filters,
        };

        return this;
    }

    addColumn(column) {
        if (!column) {
            throw new Error("Report column is required");
        }

        this.report.columns.push(column);

        return this;
    }

    addColumns(columns = []) {
        columns.forEach(
            column => this.addColumn(column)
        );

        return this;
    }

    addRow(row) {
        this.report.rows.push(row);
        return this;
    }

    addRows(rows = []) {
        rows.forEach(
            row => this.addRow(row)
        );

        return this;
    }

    setSummary(summary = {}) {
        this.report.summary = {
            ...summary,
        };

        return this;
    }

    setMetadata(metadata = {}) {
        this.report.metadata = {
            ...this.report.metadata,
            ...metadata,
        };

        return this;
    }

    build() {
        if (!this.report.title) {
            throw new Error(
                "Report title is required"
            );
        }

        return {
            ...this.report,

            columns: [...this.report.columns],
            rows: [...this.report.rows],

            generatedAt:
                new Date().toISOString(),
        };
    }
}
