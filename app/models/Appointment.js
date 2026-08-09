/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Appointment
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Appointment extends Record {

    constructor(data = {}) {

        super(data);

        this.matterId =
            data.matterId ?? null;

        this.clientId =
            data.clientId ?? null;

        this.staffId =
            data.staffId ?? null;

        this.title =
            data.title ?? "";

        this.description =
            data.description ?? "";

        this.type =
            data.type ?? "CONSULTATION";

        this.status =
            data.status ?? "SCHEDULED";

        this.startAt =
            data.startAt ?? null;

        this.endAt =
            data.endAt ?? null;

        this.location =
            data.location ?? null;

        this.meetingUrl =
            data.meetingUrl ?? null;

        this.notes =
            data.notes ?? "";

        this.reminderSent =
            data.reminderSent === true;

        this.metadata = {
            ...this.metadata,
            ...(data.metadata ?? {})
        };

        // ====================================================
        // FUTURE INSERT
        //
        // Calendar provider integration
        // WhatsApp reminders
        // Google/Outlook synchronisation
        // Recurring appointments
        // Appointment conflict detection
        // ====================================================
    }


    schedule(
        startAt,
        endAt
    ) {

        this.startAt = startAt;
        this.endAt = endAt;
        this.status = "SCHEDULED";

        this.touch();

        return this;

    }


    cancel(
        reason = ""
    ) {

        this.status = "CANCELLED";
        this.notes = reason;

        this.touch();

        return this;

    }


    complete() {

        this.status = "COMPLETED";

        this.touch();

        return this;

    }


    setMatter(
        matterId
    ) {

        this.matterId =
            matterId;

        this.touch();

        return this;

    }


    setStaff(
        staffId
    ) {

        this.staffId =
            staffId;

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.title) {

            throw new Error(
                "Appointment title is required."
            );

        }

        return true;

    }

}
