/**
 * WorkflowEngine
 * ------------------------------------------------------------
 * Central workflow orchestration engine.
 *
 * Connects to the existing:
 * - WorkflowFactory
 * - WorkflowManager
 * - WorkflowService
 * - Workflow definitions
 * - EventDispatcher
 */

export class WorkflowEngine {
    constructor({
        workflowFactory = null,
        workflowManager = null,
        workflowService = null,
        eventDispatcher = null,
        logger = console
    } = {}) {
        this.workflowFactory =
            workflowFactory;
        this.workflowManager =
            workflowManager;
        this.workflowService =
            workflowService;
        this.eventDispatcher =
            eventDispatcher;
        this.logger = logger;
    }

    async start(
        matter,
        options = {}
    ) {
        if (!matter) {
            throw new Error(
                "Matter is required"
            );
        }

        if (
            this.workflowService
                ?.start
        ) {
            return this.workflowService.start(
                matter,
                options
            );
        }

        if (
            this.workflowManager
                ?.start
        ) {
            return this.workflowManager.start(
                matter,
                options
            );
        }

        if (
            this.workflowFactory
                ?.createForMatter
        ) {
            const workflow =
                this.workflowFactory.createForMatter(
                    matter,
                    options
                );

            if (
                typeof workflow.start ===
                "function"
            ) {
                return workflow.start(
                    options
                );
            }

            return workflow;
        }

        throw new Error(
            "Workflow service, manager, or factory is required"
        );
    }

    async execute(
        context = {},
        options = {}
    ) {
        if (
            this.workflowService
                ?.execute
        ) {
            return this.workflowService.execute(
                context,
                options
            );
        }

        if (
            this.workflowManager
                ?.execute
        ) {
            return this.workflowManager.execute(
                context,
                options
            );
        }

        const workflow =
            context.workflow ||
            context;

        if (
            typeof workflow.execute ===
            "function"
        ) {
            return workflow.execute(
                options
            );
        }

        throw new Error(
            "No workflow executor is available"
        );
    }

    async transition(
        workflow,
        transition,
        options = {}
    ) {
        if (
            this.workflowService
                ?.transition
        ) {
            return this.workflowService.transition(
                workflow,
                transition,
                options
            );
        }

        if (
            this.workflowManager
                ?.transition
        ) {
            return this.workflowManager.transition(
                workflow,
                transition,
                options
            );
        }

        if (
            workflow?.transition
        ) {
            return workflow.transition(
                transition,
                options
            );
        }

        throw new Error(
            "Workflow transition is unavailable"
        );
    }

    async complete(
        workflow,
        options = {}
    ) {
        if (
            this.workflowService
                ?.complete
        ) {
            return this.workflowService.complete(
                workflow,
                options
            );
        }

        if (
            this.workflowManager
                ?.complete
        ) {
            return this.workflowManager.complete(
                workflow,
                options
            );
        }

        if (
            workflow?.complete
        ) {
            return workflow.complete(
                options
            );
        }

        throw new Error(
            "Workflow completion is unavailable"
        );
    }

    async emit(
        event,
        payload
    ) {
        if (
            this.eventDispatcher?.emit
        ) {
            return this.eventDispatcher.emit(
                event,
                payload
            );
        }

        return null;
    }
}

export default WorkflowEngine;
