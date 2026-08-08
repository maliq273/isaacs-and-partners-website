/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * WorkflowQuery
 * ------------------------------------------------------------
 * Read-side query service for workflow state.
 * ============================================================
 */

export default class WorkflowQuery {

    constructor({
        repository
    } = {}) {

        this.repository = repository;

        // ====================================================
        // FUTURE INSERT
        //
        // WorkflowRuntime integration
        // DecisionEngine integration
        // Workflow checkpoints
        // Approval queues
        // Escalations
        // Human-review queues
        //
        // ====================================================
    }

    requireRepository() {

        if (!this.repository) {
            throw new Error(
                "WorkflowQuery requires WorkflowRepository."
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
            .findWhere({
                matterId
            });

    }

    async byStatus(status) {

        return this.requireRepository()
            .findWhere({
                status
            });

    }

    async byType(type) {

        return this.requireRepository()
            .findWhere({
                type
            });

    }

    async active() {

        return this.requireRepository()
            .findWhere({
                active: true
            });

    }

    async completed() {

        return this.requireRepository()
            .findWhere({
                status: "COMPLETED"
            });

    }

    async pending() {

        return this.requireRepository()
            .findWhere({
                status: "PENDING"
            });

    }

    // ========================================================
    // FUTURE INSERT
    //
    // Current workflow step
    // Next action
    // Approval required
    // Escalation required
    // Failed workflow executions
    // Workflow audit history
    //
    // ========================================================

}
