/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Communication
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Communication extends Record {

    constructor(data = {}) {

        super(data);

        this.matterId =
            data.matterId ?? null;

        this.clientId =
            data.clientId ?? null;

        this.userId =
            data.userId ?? null;

        this.type =
            data.type ?? "NOTE";

        this.channel =
            data.channel ?? "INTERNAL";

        this.direction =
            data.direction ?? "OUTBOUND";

        this.subject =
            data.subject ?? "";

        this.message =
            data.message ?? "";

        this.recipient =
            data.recipient ?? null;

        this.sender =
            data.sender ?? null;

        this.status =
            data.status ?? "PENDING";

        this.sentAt =
            data.sentAt ?? null;

        this.threadId =
            data.threadId ??
            data.thread_id ??
            null;

        this.approval_needed =
            Boolean(
                data.approval_needed ??
                data.approvalNeeded ??
                false
            );

        this.attachments = [
            ...(data.attachments ?? [])
        ];

        // ====================================================
        // FUTURE INSERT
        //
        // WhatsApp API
        // Email provider
        // SMS provider
        // Communication templates
        // Delivery tracking
        // ====================================================
    }


    get approvalNeeded() {

        return Boolean(this.approval_needed);

    }


    set approvalNeeded(value) {

        this.approval_needed = Boolean(value);

    }


    isApprovalNeeded() {

        return Boolean(this.approval_needed);

    }


    markApprovalNeeded(needed = true) {

        this.approval_needed = Boolean(needed);

        if (this.approval_needed && this.status !== "SENT") {

            this.status = "APPROVAL_NEEDED";

        }

        this.touch();

        return this;

    }


    setApprovalNeeded(needed = true) {

        return this.markApprovalNeeded(needed);

    }


    approve() {

        this.approval_needed = false;

        if (this.status === "APPROVAL_NEEDED") {

            this.status = "APPROVED";

        }

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


    markSent() {

        this.status = "SENT";

        this.sentAt =
            new Date().toISOString();

        this.touch();

        return this;

    }


    markFailed(
        reason = ""
    ) {

        this.status = "FAILED";

        this.metadata.failureReason =
            reason;

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.message) {

            throw new Error(
                "Communication message is required."
            );

        }

        return true;

    }

}
