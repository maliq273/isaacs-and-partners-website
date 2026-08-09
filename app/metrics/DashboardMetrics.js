/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * DashboardMetrics
 * ------------------------------------------------------------
 * Business-facing dashboard metric aggregation.
 * ============================================================
 */

export default class DashboardMetrics {

    constructor(data = {}) {

        this.metrics = {
            matters: {
                total: 0,
                open: 0,
                completed: 0,
                overdue: 0
            },

            clients: {
                total: 0,
                active: 0
            },

            documents: {
                total: 0,
                pending: 0,
                verified: 0
            },

            bookings: {
                total: 0,
                upcoming: 0,
                completed: 0
            },

            financial: {
                quoted: 0,
                invoiced: 0,
                paid: 0,
                outstanding: 0
            },

            ai: {
                analyses: 0,
                successful: 0,
                failed: 0
            },

            ...(data.metrics ?? {})
        };

        this.generatedAt =
            data.generatedAt ??
            new Date().toISOString();

        // ====================================================
        // FUTURE INSERT
        //
        // Live dashboard aggregation
        // Supabase reporting
        // Matter KPIs
        // Staff KPIs
        // Financial KPIs
        // Immigration workload KPIs
        // ====================================================
    }


    set(
        category,
        key,
        value
    ) {

        if (!this.metrics[category]) {

            this.metrics[category] = {};

        }

        this.metrics[category][key] =
            value;

        this.generatedAt =
            new Date().toISOString();

        return this;

    }


    increment(
        category,
        key,
        amount = 1
    ) {

        const current =
            Number(
                this.metrics[
                    category
                ]?.[key] ?? 0
            );

        this.set(
            category,
            key,
            current +
            Number(amount)
        );

        return this;

    }


    get(
        category,
        key,
        fallback = 0
    ) {

        return (
            this.metrics[
                category
            ]?.[key] ??
            fallback
        );

    }


    getCategory(
        category
    ) {

        return {
            ...(this.metrics[category] ?? {})
        };

    }


    snapshot() {

        return {

            metrics:
                JSON.parse(
                    JSON.stringify(
                        this.metrics
                    )
                ),

            generatedAt:
                this.generatedAt

        };

    }


    reset() {

        this.metrics = {

            matters: {
                total: 0,
                open: 0,
                completed: 0,
                overdue: 0
            },

            clients: {
                total: 0,
                active: 0
            },

            documents: {
                total: 0,
                pending: 0,
                verified: 0
            },

            bookings: {
                total: 0,
                upcoming: 0,
                completed: 0
            },

            financial: {
                quoted: 0,
                invoiced: 0,
                paid: 0,
                outstanding: 0
            },

            ai: {
                analyses: 0,
                successful: 0,
                failed: 0
            }

        };

        this.generatedAt =
            new Date().toISOString();

        return this;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Dashboard widgets
    // Charts
    // Trend calculations
    // Date-range filtering
    // Role-specific dashboards
    // Supervisor dashboard
    // ========================================================

}
