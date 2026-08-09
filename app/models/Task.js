/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Task
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Task extends Record {

    constructor(data = {}) {

        super(data);

        this.matterId =
            data.matterId ?? null;

        this.assignedTo =
            data.assignedTo ?? null;

        this.createdBy =
            data.createdBy ?? null;

        this.title =
            data.title ?? "";

        this.description =
            data.description ?? "";

        this.priority =
            data.priority ?? "NORMAL";

        this.status =
            data.status ?? "OPEN";

        this.dueDate =
            data.dueDate ?? null;

        this.completed =
            data.completed === true;

        this.completedAt =
            data.completedAt ?? null;

        this.tags = [
            ...(data.tags ?? [])
        ];

        // ====================================================
        // FUTURE INSERT
        //
        // Automated task generation
        // AI next-action planner
        // SLA monitoring
        // Escalation
        // ====================================================
    }


    setMatter(
        matterId
    ) {

        this.matterId =
            matterId;

        this.touch();

        return this;

    }


    assign(
        userId
    ) {

        this.assignedTo =
            userId;

        this.touch();

        return this;

    }


    complete() {

        this.completed = true;

        this.status =
            "COMPLETED";

        this.completedAt =
            new Date().toISOString();

        this.touch();

        return this;

    }


    reopen() {

        this.completed = false;

        this.status =
            "OPEN";

        this.completedAt =
            null;

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.title) {

            throw new Error(
                "Task title is required."
            );

        }

        return true;

    }

}
