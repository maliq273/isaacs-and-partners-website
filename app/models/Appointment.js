/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Appointment
 * ============================================================
 */

import Record from "./base/Record.js";

import {

    AppointmentStatus

} from "../domain/enums/index.js";

export default class Appointment extends Record {

    constructor(data = {}) {

        super(data);

        this.subject = data.subject ?? "";

        this.start = data.start ?? null;

        this.end = data.end ?? null;

        this.location = data.location ?? "";

        this.meetingType = data.meetingType ?? "IN_PERSON";

        this.consultantId = data.consultantId ?? null;

        this.status = data.status ?? AppointmentStatus.PENDING;

        this.notes = [];

    }

    confirm() {

        this.status = AppointmentStatus.CONFIRMED;

        this.touch();

        return this;

    }

    complete() {

        this.status = AppointmentStatus.COMPLETED;

        this.touch();

        return this;

    }

    cancel() {

        this.status = AppointmentStatus.CANCELLED;

        this.touch();

        return this;

    }

}
