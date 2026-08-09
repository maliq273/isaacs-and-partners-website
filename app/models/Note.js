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

        this.matterId =
            data.matterId ?? null;

        this.clientId =
            data.clientId ?? null;

        this.authorId =
            data.authorId ?? null;

        this.title =
            data.title ?? "";

        this.content =
            data.content ?? "";

        this.type =
            data.type ?? "GENERAL";

        this.private =
            data.private === true;

        this.pinned =
            data.pinned === true;

        // ====================================================
        // FUTURE INSERT
        //
        // Legal privilege
        // Confidential notes
        // AI-generated notes
        // Note versioning
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

        super.validate();

        if (!this.content) {

            throw new Error(
                "Note content is required."
            );

        }

        return true;

    }

}
