/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * DashboardQuery
 * ------------------------------------------------------------
 * Aggregates read-only information required by dashboards.
 * ============================================================
 */

export default class DashboardQuery {

    constructor({
        matterQuery = null,
        clientQuery = null,
        documentQuery = null,
        bookingQuery = null,
        knowledgeQuery = null,
        workflowQuery = null
    } = {}) {

        this.matterQuery =
            matterQuery;

        this.clientQuery =
            clientQuery;

        this.documentQuery =
            documentQuery;

        this.bookingQuery =
            bookingQuery;

        this.knowledgeQuery =
            knowledgeQuery;

        this.workflowQuery =
            workflowQuery;

        // ====================================================
        // FUTURE INSERT
        //
        // Supervisor dashboard
        // Attorney dashboard
        // Immigration dashboard
        // Client dashboard
        // Operations dashboard
        // AI dashboard
        // Financial dashboard
        //
        // ====================================================
    }


    async getOverview() {

        const result = {

            matters: {
                total: 0,
                open: 0,
                outstandingDocuments: 0
            },

            clients: {
                total: 0
            },

            documents: {
                outstanding: 0
            },

            bookings: {
                upcoming: 0
            },

            workflows: {
                active: 0,
                pending: 0,
                completed: 0
            },

            // =================================================
            // FUTURE INSERT
            //
            // AI risk indicators
            // Revenue
            // Outstanding invoices
            // SLA breaches
            // User activity
            // =================================================

        };


        if (this.matterQuery) {

            const matters =
                await this.matterQuery.all();

            result.matters.total =
                matters.length;

            result.matters.open =
                (
                    await this.matterQuery.open()
                ).length;

            result.matters.outstandingDocuments =
                (
                    await this.matterQuery
                        .withOutstandingDocuments()
                ).length;

        }


        if (this.clientQuery) {

            result.clients.total =
                (
                    await this.clientQuery.all()
                ).length;

        }


        if (this.documentQuery) {

            result.documents.outstanding =
                (
                    await this.documentQuery
                        .outstanding()
                ).length;

        }


        if (this.bookingQuery) {

            result.bookings.upcoming =
                (
                    await this.bookingQuery
                        .upcoming()
                ).length;

        }


        if (this.workflowQuery) {

            result.workflows.active =
                (
                    await this.workflowQuery
                        .active()
                ).length;

            result.workflows.pending =
                (
                    await this.workflowQuery
                        .pending()
                ).length;

            result.workflows.completed =
                (
                    await this.workflowQuery
                        .completed()
                ).length;

        }

        return result;

    }


    async getMatterDashboard() {

        return {

            total:
                this.matterQuery
                    ? (
                        await this.matterQuery.all()
                    ).length
                    : 0,

            open:
                this.matterQuery
                    ? (
                        await this.matterQuery.open()
                    ).length
                    : 0,

            outstandingDocuments:
                this.matterQuery
                    ? (
                        await this.matterQuery
                            .withOutstandingDocuments()
                    ).length
                    : 0

        };

    }


    async getClientDashboard() {

        return {

            total:
                this.clientQuery
                    ? (
                        await this.clientQuery.all()
                    ).length
                    : 0

        };

    }


    async getDocumentDashboard() {

        return {

            outstanding:
                this.documentQuery
                    ? (
                        await this.documentQuery
                            .outstanding()
                    ).length
                    : 0

        };

    }


    async getBookingDashboard() {

        return {

            upcoming:
                this.bookingQuery
                    ? (
                        await this.bookingQuery
                            .upcoming()
                    ).length
                    : 0

        };

    }

    // ========================================================
    // FUTURE INSERT
    //
    // ROLE-SPECIFIC DASHBOARDS
    //
    // Supervisor
    // Attorney
    // Consultant
    // Immigration case handler
    // Client
    // Finance
    // Administrator
    //
    // ========================================================

}
