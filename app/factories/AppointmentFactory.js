/**
 * AppointmentFactory
 * ------------------------------------------------------------
 * Creates Appointment domain records.
 *
 * Works with:
 * - Appointment model
 * - AppointmentValidator
 * - AppointmentMapper
 */

export class AppointmentFactory {
    constructor({
        Appointment = null,
        validator = null,
        mapper = null
    } = {}) {
        this.Appointment = Appointment;
        this.validator = validator;
        this.mapper = mapper;
    }

    create(data = {}, options = {}) {
        const normalised =
            this.normalise(data);

        if (
            this.validator &&
            typeof this.validator.validate ===
                "function"
        ) {
            this.validator.validate(
                normalised
            );
        }

        if (this.Appointment) {
            return new this.Appointment(
                normalised
            );
        }

        return {
            ...normalised
        };
    }

    fromRecord(record = {}) {
        return this.create(
            record
        );
    }

    toPersistence(appointment) {
        if (
            this.mapper &&
            typeof this.mapper.toPersistence ===
                "function"
        ) {
            return this.mapper.toPersistence(
                appointment
            );
        }

        return {
            ...appointment
        };
    }

    normalise(data = {}) {
        return {
            id:
                data.id ||
                null,

            clientId:
                data.clientId ||
                data.client_id ||
                null,

            matterId:
                data.matterId ||
                data.matter_id ||
                null,

            date:
                data.date ||
                null,

            startTime:
                data.startTime ||
                data.start_time ||
                null,

            endTime:
                data.endTime ||
                data.end_time ||
                null,

            type:
                data.type ||
                data.appointmentType ||
                null,

            status:
                data.status ||
                "scheduled",

            assignedTo:
                data.assignedTo ||
                data.assigned_to ||
                null,

            location:
                data.location ||
                null,

            notes:
                data.notes ||
                "",

            metadata:
                data.metadata || {}
        };
    }
}

export default AppointmentFactory;
