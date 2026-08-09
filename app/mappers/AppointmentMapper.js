/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Appointment Mapper
 * ------------------------------------------------------------
 * Converts Appointment domain objects to/from persistence
 * and transport representations.
 * ============================================================
 */

export default class AppointmentMapper {

    static toPersistence(appointment) {

        if (!appointment) {
            return null;
        }

        const data =
            typeof appointment.toJSON === "function"
                ? appointment.toJSON()
                : { ...appointment };

        return {
            ...data,
            id: appointment.id ?? data.id ?? null
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Supabase appointment mapping
        // Calendar provider mapping
        // Google Calendar mapping
        // Outlook mapping
        // WhatsApp appointment mapping
        // ====================================================
    }


    static fromPersistence(data) {

        if (!data) {
            return null;
        }

        return {
            ...data
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Rehydrate Appointment model
        // Database-specific field conversion
        // Date/time normalization
        // ====================================================
    }


    static toTransport(appointment) {

        if (!appointment) {
            return null;
        }

        const data =
            this.toPersistence(appointment);

        return {
            ...data
        };
    }


    static collection(items = []) {

        return items
            .filter(Boolean)
            .map(item =>
                this.toPersistence(item)
            );
    }

}
