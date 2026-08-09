/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * TimelineEntry
 * ============================================================
 */

import Record from "./base/Record.js";

export default class TimelineEntry extends Record {

    constructor(data = {}) {

        super(data);

        this.matterId =
            data.matterId ?? null;

        this.type =
            data.type ?? "GENERAL";

        this.title =
            data.title ?? "";

        this.description =
            data.description ?? "";

        this.actorId =
            data.actorId ?? null;

        this.timestamp =
            data.timestamp ??
            new Date().toISOString();

        this.relatedEntityType =
            data.relatedEntityType ?? null;

        this.relatedEntityId =
            data.relatedEntityId ?? null;

        this.metadata = {
            ...this.metadata,
            ...(data.metadata ?? {})
        };

        // ====================================================
        // FUTURE INSERT
        //
        // Automated chronology
        // Audit events
        // Legal case chronology
        // AI chronology generation
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


    validate() {

        super.validate();

        if (!this.title) {

            throw new Error(
                "Timeline title is required."
            );

        }

        return true;

    }

}
