/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Timeline Entry
 * ============================================================
 */

import Record from "./base/Record.js";

export default class TimelineEntry extends Record {

    constructor(data = {}) {

        super(data);

        this.title = data.title ?? "";

        this.description = data.description ?? "";

        this.type = data.type ?? "GENERAL";

        this.icon = data.icon ?? "";

        this.visibleToClient = data.visibleToClient ?? true;

    }

    validate() {

        if (!this.title) {

            throw new Error("Timeline title is required.");

        }

        return true;

    }

}
