/**
 * AutomationEngine
 * ------------------------------------------------------------
 * Coordinates automated application actions.
 *
 * Intended to work with:
 * - WorkflowEngine
 * - NotificationEngine
 * - BookingEngine
 * - DocumentEngine
 * - TimelineEngine
 * - EventDispatcher
 */

export class AutomationEngine {
    constructor({
        workflowEngine = null,
        notificationEngine = null,
        bookingEngine = null,
        documentEngine = null,
        timelineEngine = null,
        eventDispatcher = null,
        logger = console
    } = {}) {
        this.workflowEngine =
            workflowEngine;
        this.notificationEngine =
            notificationEngine;
        this.bookingEngine =
            bookingEngine;
        this.documentEngine =
            documentEngine;
        this.timelineEngine =
            timelineEngine;
        this.eventDispatcher =
            eventDispatcher;
        this.logger = logger;
    }

    async execute(
        action,
        context = {},
        options = {}
    ) {
        if (!action) {
            throw new Error(
                "Automation action is required"
            );
        }

        switch (
            String(action).toLowerCase()
        ) {
            case "workflow":
                return this.executeWorkflow(
                    context,
                    options
                );

            case "notification":
                return this.executeNotification(
                    context,
                    options
                );

            case "booking":
                return this.executeBooking(
                    context,
                    options
                );

            case "document":
                return this.executeDocument(
                    context,
                    options
                );

            case "timeline":
                return this.executeTimeline(
                    context,
                    options
                );

            default:
                throw new Error(
                    `Unsupported automation action: ${action}`
                );
        }
    }

    async executeWorkflow(
        context,
        options
    ) {
        if (
            !this.workflowEngine
        ) {
            throw new Error(
                "WorkflowEngine is required"
            );
        }

        return this.workflowEngine.execute(
            context,
            options
        );
    }

    async executeNotification(
        context,
        options
    ) {
        if (
            !this.notificationEngine
        ) {
            throw new Error(
                "NotificationEngine is required"
            );
        }

        return this.notificationEngine.send(
            context,
            options
        );
    }

    async executeBooking(
        context,
        options
    ) {
        if (!this.bookingEngine) {
            throw new Error(
                "BookingEngine is required"
            );
        }

        return this.bookingEngine.create(
            context,
            options
        );
    }

    async executeDocument(
        context,
        options
    ) {
        if (
            !this.documentEngine
        ) {
            throw new Error(
                "DocumentEngine is required"
            );
        }

        return this.documentEngine.process(
            context,
            options
        );
    }

    async executeTimeline(
        context,
        options
    ) {
        if (
            !this.timelineEngine
        ) {
            throw new Error(
                "TimelineEngine is required"
            );
        }

        return this.timelineEngine.record(
            context,
            options
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

export default AutomationEngine;
