/**
 * WorkflowEvents
 * ------------------------------------------------------------
 * Workflow lifecycle and state-transition events.
 */

export const WorkflowEvents = Object.freeze({
    CREATED:
        "workflow.created",

    STARTED:
        "workflow.started",

    RESUMED:
        "workflow.resumed",

    PAUSED:
        "workflow.paused",

    COMPLETED:
        "workflow.completed",

    FAILED:
        "workflow.failed",

    CANCELLED:
        "workflow.cancelled",

    STEP_STARTED:
        "workflow.step.started",

    STEP_COMPLETED:
        "workflow.step.completed",

    STEP_FAILED:
        "workflow.step.failed",

    TRANSITION_STARTED:
        "workflow.transition.started",

    TRANSITION_COMPLETED:
        "workflow.transition.completed",

    TRANSITION_REJECTED:
        "workflow.transition.rejected",

    DOCUMENT_REQUIRED:
        "workflow.document.required",

    DOCUMENT_RECEIVED:
        "workflow.document.received",

    DOCUMENT_VERIFIED:
        "workflow.document.verified",

    ACTION_REQUIRED:
        "workflow.action.required",

    DEADLINE_APPROACHING:
        "workflow.deadline.approaching",

    DEADLINE_MISSED:
        "workflow.deadline.missed"
});

export default WorkflowEvents;
