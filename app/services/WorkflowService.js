/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * WorkflowService
 * ============================================================
 *
 * LOCATION
 * app/services/WorkflowService.js
 * ============================================================
 */

export default class WorkflowService {

    constructor({
        workflowRepository = null,
        workflowRuntime = null,
        aiService = null,
        logger = null
    } = {}) {

        this.workflowRepository =
            workflowRepository;

        this.workflowRuntime =
            workflowRuntime;

        this.aiService =
            aiService;

        this.logger =
            logger;
    }

    async createWorkflow(
        data = {}
    ) {

        if (!data.name) {
            throw new Error(
                "Workflow name is required."
            );
        }

        if (
            this.workflowRepository &&
            typeof this.workflowRepository.create ===
            "function"
        ) {
            return this.workflowRepository.create({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        return {
            id:
                `WORKFLOW-${Date.now()}`,
            ...data
        };
    }

    async getWorkflow(
        workflowId
    ) {

        if (
            this.workflowRepository &&
            typeof this.workflowRepository.findById ===
            "function"
        ) {
            return this.workflowRepository
                .findById(
                    workflowId
                );
        }

        return null;
    }

    async startWorkflow({
        workflowId,
        context = {}
    } = {}) {

        if (!workflowId) {
            throw new Error(
                "Workflow ID is required."
            );
        }

        if (
            this.workflowRuntime &&
            typeof this.workflowRuntime.start ===
            "function"
        ) {
            return this.workflowRuntime.start(
                workflowId,
                context
            );
        }

        return {
            workflowId,
            status: "STARTED",
            context
        };
    }

    async executeStep({
        workflowId,
        step,
        context = {}
    } = {}) {

        if (
            this.workflowRuntime &&
            typeof this.workflowRuntime.executeStep ===
            "function"
        ) {
            return this.workflowRuntime
                .executeStep({
                    workflowId,
                    step,
                    context
                });
        }

        return {
            workflowId,
            step,
            status: "PENDING"
        };
    }

    async pauseWorkflow(
        workflowId
    ) {

        if (
            this.workflowRuntime &&
            typeof this.workflowRuntime.pause ===
            "function"
        ) {
            return this.workflowRuntime.pause(
                workflowId
            );
        }

        return true;
    }

    async resumeWorkflow(
        workflowId
    ) {

        if (
            this.workflowRuntime &&
            typeof this.workflowRuntime.resume ===
            "function"
        ) {
            return this.workflowRuntime.resume(
                workflowId
            );
        }

        return true;
    }

    async completeWorkflow(
        workflowId
    ) {

        if (
            this.workflowRuntime &&
            typeof this.workflowRuntime.complete ===
            "function"
        ) {
            return this.workflowRuntime.complete(
                workflowId
            );
        }

        return true;
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Immigration workflows
     * HR workflows
     * CCMA workflows
     * Legal workflows
     * Business workflows
     * Appeal workflows
     * VFS workflows
     * DHA workflows
     * AI-generated workflows
     * ========================================================
     */

}
