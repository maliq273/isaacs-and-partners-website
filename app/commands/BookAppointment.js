/**
 * BookAppointment Command
 *
 * Creates a request to book an appointment against a client,
 * matter, staff member or service.
 */

export default class BookAppointment {
    constructor({
        clientId = null,
        matterId = null,
        appointmentType,
        startAt,
        endAt = null,
        staffId = null,
        location = null,
        notes = null,
        bookedBy,
        metadata = {},
    } = {}) {
        if (!appointmentType) {
            throw new Error("appointmentType is required");
        }

        if (!startAt) {
            throw new Error("startAt is required");
        }

        if (!bookedBy) {
            throw new Error("bookedBy is required");
        }

        this.name = "BookAppointment";
        this.clientId = clientId;
        this.matterId = matterId;
        this.appointmentType = appointmentType;
        this.startAt = startAt;
        this.endAt = endAt;
        this.staffId = staffId;
        this.location = location;
        this.notes = notes;
        this.bookedBy = bookedBy;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            clientId: this.clientId,
            matterId: this.matterId,
            appointmentType: this.appointmentType,
            startAt: this.startAt,
            endAt: this.endAt,
            staffId: this.staffId,
            location: this.location,
            notes: this.notes,
            bookedBy: this.bookedBy,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
