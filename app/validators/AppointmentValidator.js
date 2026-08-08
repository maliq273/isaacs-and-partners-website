/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * AppointmentValidator
 * ============================================================
 *
 * LOCATION
 * app/validators/AppointmentValidator.js
 *
 * PURPOSE
 * Validates appointment data before it enters the domain,
 * repository or workflow layers.
 * ============================================================
 */

export default class AppointmentValidator {

    static validate(data = {}) {

        const errors = [];

        if (!data) {
            return {
                valid: false,
                errors: ["Appointment data is required."]
            };
        }

        if (!data.clientId) {
            errors.push("Client ID is required.");
        }

        if (!data.matterId) {
            errors.push("Matter ID is required.");
        }

        if (!data.startTime && !data.date) {
            errors.push(
                "Appointment date or start time is required."
            );
        }

        if (data.endTime && data.startTime) {

            const start =
                new Date(data.startTime);

            const end =
                new Date(data.endTime);

            if (
                !Number.isNaN(start.getTime()) &&
                !Number.isNaN(end.getTime()) &&
                end <= start
            ) {
                errors.push(
                    "Appointment end time must be after start time."
                );
            }
        }

        /*
         * ====================================================
         * FUTURE INSERT
         * APPOINTMENT TYPE VALIDATION
         *
         * Consultation
         * Follow-up
         * VFS
         * DHA
         * Internal
         * Client meeting
         * ====================================================
         */

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static assert(data = {}) {

        const result =
            this.validate(data);

        if (!result.valid) {
            throw new Error(
                result.errors.join(" ")
            );
        }

        return true;
    }

    static validateAvailability({
        startTime,
        endTime
    } = {}) {

        const errors = [];

        if (!startTime) {
            errors.push(
                "Start time is required."
            );
        }

        if (!endTime) {
            errors.push(
                "End time is required."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Staff availability
     * Calendar conflicts
     * Working hours
     * Public holidays
     * Appointment duration
     * Branch restrictions
     * ========================================================
     */
}
