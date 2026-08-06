/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Note
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Note extends Record {

    constructor(data = {}) {

        super(data);

        this.title = data.title ?? "";

        this.content = data.content ?? "";

        this.author = data.author ?? null;

        this.private = data.private ?? false;

        this.pinned = data.pinned ?? false;

    }

    pin() {

        this.pinned = true;

        this.touch();

        return this;

    }

    unpin() {

        this.pinned = false;

        this.touch();

        return this;

    }

    validate() {

        if (!this.content) {

            throw new Error("Note content is required.");

        }

        return true;

    }

}
