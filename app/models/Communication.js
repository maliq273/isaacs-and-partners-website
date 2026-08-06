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

        this.type = data.type ?? "EMAIL";

        this.direction = data.direction ?? "OUTBOUND";

        this.subject = data.subject ?? "";

        this.message = data.message ?? "";

        this.sender = data.sender ?? "";

        this.recipient = data.recipient ?? "";

        this.sentAt = data.sentAt ?? new Date().toISOString();

        this.read = false;

    }

    markRead() {

        this.read = true;

        this.touch();

        return this;

    }

}
