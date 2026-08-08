/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ReportSerializer
 * ------------------------------------------------------------
 * Standardises reporting data before UI/API transmission.
 * ============================================================
 */

export default class ReportSerializer {

    static toJSON(
        report
    ) {

        if (!report) {
            return null;
        }

        return {

            id:
                report.id ?? null,

            name:
                report.name ?? "",

            title:
                report.title ?? "",

            type:
                report.type ?? null,

            category:
                report.category ?? null,

            description:
                report.description ?? "",

            period:
                report.period ?? null,

            startDate:
                report.startDate ?? null,

            endDate:
                report.endDate ?? null,

            generatedAt:
                report.generatedAt ?? null,

            generatedBy:
                report.generatedBy ?? null,

            status:
                report.status ?? null,

            filters:
                report.filters ?? {},

            summary:
                report.summary ?? {},

            totals:
                report.totals ?? {},

            rows:
                Array.isArray(report.rows)
                    ? report.rows.map(
                        row => ({
                            ...row
                        })
                    )
                    : [],

            metadata:
                report.metadata ?? {}

        };

        // ====================================================
        // FUTURE INSERT
        //
        // Financial reports
        // Matter reports
        // Immigration reports
        // Staff reports
        // Compliance reports
        // AI reports
        // Audit reports
        // Dashboard chart datasets
        // Excel/PDF export metadata
        //
        // ====================================================
    }


    static serialize(
        report
    ) {

        return this.toJSON(
            report
        );

    }


    static serializeMany(
        reports = []
    ) {

        return reports
            .filter(Boolean)
            .map(
                report =>
                    this.toJSON(
                        report
                    )
            );

    }


    static fromJSON(
        data = {}
    ) {

        return {
            ...data
        };

    }

}
