/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * BookingResult
 * ============================================================
 */

import Result from "./Result.js";

export default class BookingResult
    extends Result {

    constructor(data = {}) {

        super({

            ...data,

            code:
                data.code ??
                "BOOKING_SUCCESS"

        });

        this.booking =
            data.booking ?? null;

        this.bookingId =
            data.bookingId ??
            data.booking?.id ??
            null;

        this.confirmationNumber =
            data.confirmationNumber ??
            null;

        this.startTime =
            data.startTime ??
            data.booking?.startTime ??
            null;

        this.endTime =
            data.endTime ??
            data.booking?.endTime ??
            null;

        this.status =
            data.status ??
            data.booking?.status ??
            null;

        this.conflicts =
            Array.isArray(data.conflicts)
                ? [...data.conflicts]
                : [];

        // ====================================================
        // FUTURE INSERT
        //
        // Calendar provider
        // WhatsApp confirmation
        // Email confirmation
        // Reminder schedule
        // Staff availability
        // Rescheduling
        //
        // ====================================================
    }

}
