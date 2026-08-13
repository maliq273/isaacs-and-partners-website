import ApplicationException from "./ApplicationException.js";

/**
 * WorkflowException
 * ------------------------------------------------------------
 * Workflow creation, transition, execution, or state-machine
 * failure.
 */

export class WorkflowException extends ApplicationException {
    constructor(
        message = "Workflow operation failed",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "WORKFLOW_ERROR",
            status:
                options.status || 422
        });

        this.name =
            "WorkflowException";
    }
}

export default WorkflowException;
