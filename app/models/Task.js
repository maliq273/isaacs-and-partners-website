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

        this.title = data.title ?? "";

        this.description = data.description ?? "";

        this.assignedTo = data.assignedTo ?? null;

        this.completed = data.completed ?? false;

        this.completedAt = null;

        this.dueDate = data.dueDate ?? null;

    }

    complete() {

        this.completed = true;

        this.completedAt = new Date().toISOString();

        this.touch();

        return this;

    }

    reopen() {

        this.completed = false;

        this.completedAt = null;

        this.touch();

        return this;

    }

}
