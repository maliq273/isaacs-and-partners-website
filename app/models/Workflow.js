/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Workflow
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Workflow extends Record {

    constructor(data = {}) {

        super(data);

        this.name =
            data.name ?? "";

        this.code =
            data.code ?? "";

        this.type =
            data.type ?? "";

        this.description =
            data.description ?? "";

        this.status =
            data.status ?? "DRAFT";

        this.version =
            data.version ?? 1;

        this.matterId =
            data.matterId ?? null;

        this.createdBy =
            data.createdBy ?? null;

        this.assignedTo =
            data.assignedTo ?? null;

        this.currentStage =
            data.currentStage ?? null;

        this.stages = [
            ...(data.stages ?? [])
        ];

        this.variables = {
            ...(data.variables ?? {})
        };

        this.results = {
            ...(data.results ?? {})
        };

        this.history = [
            ...(data.history ?? [])
        ];

        // ====================================================
        // FUTURE INSERT
        //
        // Pipeline integration
        // Workflow runtime
        // Decision engine
        // AI orchestration
        // Human approval gates
        // Rollback/checkpoints
        // ====================================================
    }


    addStage(
        stage
    ) {

        this.stages.push(
            stage
        );

        this.touch();

        return this;

    }


    setStage(
        stage
    ) {

        this.currentStage =
            stage;

        this.history.push({

            type:
                "STAGE_CHANGED",

            stage,

            timestamp:
                new Date().toISOString()

        });

        this.touch();

        return this;

    }


    setVariable(
        key,
        value
    ) {

        this.variables[key] =
            value;

        this.touch();

        return this;

    }


    getVariable(
        key,
        fallback = null
    ) {

        return (
            this.variables[key] ??
            fallback
        );

    }


    setResult(
        key,
        value
    ) {

        this.results[key] =
            value;

        this.touch();

        return this;

    }


    start() {

        this.status =
            "RUNNING";

        this.touch();

        return this;

    }


    pause() {

        this.status =
            "PAUSED";

        this.touch();

        return this;

    }


    complete() {

        this.status =
            "COMPLETED";

        this.touch();

        return this;

    }


    fail(
        reason = ""
    ) {

        this.status =
            "FAILED";

        this.metadata.failureReason =
            reason;

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.name) {

            throw new Error(
                "Workflow name is required."
            );

        }

        return true;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Workflow schema validation
    // Conditional branching
    // AI decision nodes
    // Human approvals
    // SLA timers
    // Automated escalation
    // ========================================================

}
