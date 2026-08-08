/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * WorkflowResult
 * ------------------------------------------------------------
 * Standard result returned by workflow execution.
 * ============================================================
 */

import Result from "./Result.js";

export default class WorkflowResult
    extends Result {

    constructor(data = {}) {

        super({

            ...data,

            code:
                data.code ??
                "WORKFLOW_SUCCESS"

        });

        this.workflow =
            data.workflow ?? null;

        this.workflowId =
            data.workflowId ??
            data.workflow?.id ??
            null;

        this.status =
            data.status ??
            data.workflow?.status ??
            null;

        this.currentStep =
            data.currentStep ??
            data.workflow?.currentStep ??
            null;

        this.completed =
            Boolean(
                data.completed ??
                false
            );

        this.nextStep =
            data.nextStep ?? null;

        this.output =
            data.output ?? null;

        this.errors =
            Array.isArray(data.errors)
                ? [...data.errors]
                : [];

        // ====================================================
        // FUTURE INSERT
        //
        // WorkflowRuntime
        // DecisionEngine
        // AI workflow decisions
        // Human approvals
        // Escalations
        // Checkpoints
        // VFS/DHA submission stages
        // Bundle generation stages
        //
        // ====================================================
    }


    isComplete() {

        return (
            this.completed === true ||
            this.status === "COMPLETED"
        );

    }

}
