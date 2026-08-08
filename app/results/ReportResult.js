/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ReportResult
 * ============================================================
 */

import Result from "./Result.js";

export default class ReportResult
    extends Result {

    constructor(data = {}) {

        super({

            ...data,

            code:
                data.code ??
                "REPORT_SUCCESS"

        });

        this.report =
            data.report ?? null;

        this.reportId =
            data.reportId ??
            data.report?.id ??
            null;

        this.reportType =
            data.reportType ??
            data.report?.type ??
            null;

        this.period =
            data.period ??
            data.report?.period ??
            null;

        this.rows =
            Array.isArray(data.rows)
                ? [...data.rows]
                : [];

        this.totals =
            data.totals ?? {};

        this.exportFormats =
            Array.isArray(
                data.exportFormats
            )
                ? [...data.exportFormats]
                : [];

        // ====================================================
        // FUTURE INSERT
        //
        // PDF export
        // Excel export
        // CSV export
        // Dashboard datasets
        // Financial reporting
        // SARS reporting
        // Management reporting
        //
        // ====================================================
    }

}
